// ===================
// ANDROID BRIDGE ADAPTER
// ===================
const A = window.AndroidStorage;
const Nav = window.AndroidNav;

window.api = {
  history: {
    get: async () => JSON.parse(A.getHistory() || '[]'),
    add: async (entry) => JSON.parse(A.addHistory(JSON.stringify(entry))),
    remove: async (url) => JSON.parse(A.removeHistory(url)),
    clear: async () => JSON.parse(A.clearHistory())
  },
  bookmarks: {
    get: async () => JSON.parse(A.getBookmarks() || '[]'),
    add: async (entry) => JSON.parse(A.addBookmark(JSON.stringify(entry))),
    remove: async (url) => JSON.parse(A.removeBookmark(url))
  },
  config: {
    getApiKey: async () => A.getApiKey(),
    setApiKey: async (key) => A.setApiKey(key),
    getStartUrl: async () => A.getStartUrl(),
    setStartUrl: async (url) => A.setStartUrl(url),
    getStoragePath: async () => A.getStoragePath()
  }
};

// ===================
// STATE
// ===================
let currentMeta = null;
let tmdbApiKey = '';
let startUrl = 'https://www.cineby.app';
let metaCache = {};
let confirmCallback = null;
let lastTrackedUrl = '';

const $ = (id) => document.getElementById(id);
const homeScreen = $('homeScreen');
const settingsModal = $('settingsModal');
const confirmDialog = $('confirmDialog');

// ===================
// URL PARSING
// ===================
function parseCinebyUrl(url) {
  try {
    const u = new URL(url);
    const path = u.pathname;
    const search = u.search;
    let m;

    m = path.match(/\/(?:watch\/)?movie\/(\d+)/i);
    if (m) return { type: 'movie', id: m[1] };

    m = path.match(/\/(?:watch\/)?tv\/(\d+)(?:\/(\d+))?(?:\/(\d+))?/i);
    if (m) return { type: 'tv', id: m[1], season: m[2] || null, episode: m[3] || null };

    m = path.match(/\/title\/(movie|tv|series)\/(\d+)/i);
    if (m) {
      const type = m[1].toLowerCase() === 'series' ? 'tv' : m[1].toLowerCase();
      return { type, id: m[2] };
    }

    m = path.match(/\/show\/(\d+)(?:\/(\d+))?(?:\/(\d+))?/i);
    if (m) return { type: 'tv', id: m[1], season: m[2] || null, episode: m[3] || null };

    m = path.match(/\/film\/(\d+)/i);
    if (m) return { type: 'movie', id: m[1] };

    const urlParams = new URLSearchParams(search);
    const queryId = urlParams.get('id') || urlParams.get('tmdb');
    if (queryId) {
      let type = urlParams.get('type') || 'movie';
      if (type === 'series' || type === 'show') type = 'tv';
      if (type === 'film') type = 'movie';
      return { type, id: queryId };
    }

    return null;
  } catch (e) { return null; }
}

// Only track URLs that are actual cineby content pages, not player/ad subframes
function isCinebyContentUrl(url) {
  try {
    const u = new URL(url);
    const host = u.hostname;
    // Must be a cineby domain
    if (!host.includes('cineby')) return false;
    // Must have a recognisable content path (movie/tv/show/film/title)
    const path = u.pathname;
    return /\/(watch\/)?(movie|tv|show|film|title)\/\d+/i.test(path);
  } catch (e) { return false; }
}

// ===================
// TMDB
// ===================
async function fetchTmdbMeta(parsed) {
  if (!tmdbApiKey || !parsed) return null;
  const cacheKey = `${parsed.type}_${parsed.id}`;
  if (metaCache[cacheKey]) {
    return { ...metaCache[cacheKey], season: parsed.season, episode: parsed.episode };
  }
  const typesToTry = parsed.type === 'unknown' ? ['movie', 'tv'] : [parsed.type];
  for (const type of typesToTry) {
    try {
      const res = await fetch(`https://api.themoviedb.org/3/${type}/${parsed.id}?api_key=${tmdbApiKey}`);
      if (!res.ok) continue;
      const data = await res.json();
      const meta = {
        title: data.title || data.name || 'Unknown',
        poster: data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : null,
        backdrop: data.backdrop_path ? `https://image.tmdb.org/t/p/w1280${data.backdrop_path}` : null,
        year: (data.release_date || data.first_air_date || '').slice(0, 4),
        type, season: parsed.season, episode: parsed.episode
      };
      metaCache[cacheKey] = meta;
      return meta;
    } catch (e) { console.error('TMDB:', e); }
  }
  return null;
}

function fallbackMeta(parsed, url) {
  if (parsed) return {
    title: parsed.type === 'movie' ? `Movie #${parsed.id}` : `Show #${parsed.id}`,
    poster: null, backdrop: null, year: '',
    type: parsed.type, season: parsed.season, episode: parsed.episode
  };
  return { title: 'Cineby page', poster: null, backdrop: null, year: '', type: 'other', url };
}

// ===================
// URL CHANGE HANDLER (called by Kotlin every 1.5s via polling)
// ===================
window.onCinebyUrlChange = async function(url) {
  if (!url || url === lastTrackedUrl) return;
  if (!isCinebyContentUrl(url)) return; // ignore player/ad frames
  lastTrackedUrl = url;

  const parsed = parseCinebyUrl(url);
  if (!parsed) return;

  const meta = (await fetchTmdbMeta(parsed)) || fallbackMeta(parsed, url);
  currentMeta = { url, meta, timestamp: Date.now() };
  await window.api.history.add(currentMeta);
  console.log('Tracked:', meta.title, url);
};

// Called by Kotlin SAVE button
window.saveCurrentFromAndroid = async function() {
  if (!currentMeta) { showToast('NO CONTENT TO SAVE'); return; }
  await window.api.bookmarks.add(currentMeta);
  showToast('SAVED // ' + currentMeta.meta.title.toUpperCase());
};

// Called by Kotlin when user returns home
window.onReturnHome = async function() {
  currentMeta = null;
  await refreshHomeData();
};

// ===================
// NAVIGATION
// ===================
function openCineby(url) {
  Nav.openUrl(url || startUrl);
}

// ===================
// BANNER CARD
// ===================
function renderBannerCard(entry, options = {}) {
  const card = document.createElement('div');
  card.className = 'banner-card';
  card.setAttribute('tabindex', '0');
  card.setAttribute('data-focusable', 'true');
  card.setAttribute('data-url', entry.url);

  const dateStr = new Date(entry.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  let typeBadge = '';
  let episodeTag = '';
  if (entry.meta.type === 'tv') {
    typeBadge = 'SERIES';
    if (entry.meta.season && entry.meta.episode) {
      episodeTag = `<span class="meta-tag cyan">S${entry.meta.season} E${entry.meta.episode}</span>`;
    }
  } else if (entry.meta.type === 'movie') {
    typeBadge = 'FILM';
  }

  const bgImage = entry.meta.backdrop || entry.meta.poster;
  const bgStyle = bgImage
    ? `<div class="banner-card-bg" style="background-image:url('${bgImage}')"></div>`
    : `<div class="banner-card-bg placeholder">${escapeHtml((entry.meta.title || '?').charAt(0))}</div>`;

  card.innerHTML = `
    ${bgStyle}
    <div class="banner-card-gradient"></div>
    ${options.bookmark ? '<div class="banner-card-badge">★ SAVED</div>' : ''}
    ${typeBadge && !options.bookmark ? `<div class="banner-card-badge">${typeBadge}</div>` : ''}
    <button class="banner-card-remove" title="Remove">×</button>
    <div class="banner-card-play">▶</div>
    <div class="banner-card-content">
      <div class="banner-card-title">${escapeHtml(entry.meta.title)}</div>
      <div class="banner-card-meta">
        ${episodeTag}
        ${entry.meta.year ? `<span class="meta-time">${entry.meta.year}</span>` : ''}
        <span class="meta-time">· ${dateStr}</span>
      </div>
    </div>
  `;

  card.addEventListener('click', (e) => {
    if (e.target.closest('.banner-card-remove')) return;
    openCineby(entry.url);
  });

  card.querySelector('.banner-card-remove').addEventListener('click', async (e) => {
    e.stopPropagation();
    if (options.bookmark) await window.api.bookmarks.remove(entry.url);
    else await window.api.history.remove(entry.url);
    await refreshHomeData();
    showToast('REMOVED');
  });

  return card;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

// ===================
// HERO
// ===================
async function updateHero() {
  const history = await window.api.history.get();
  const heroBg = $('heroBg');
  const heroTitle = $('heroTitle');
  const heroSub = $('heroSub');
  const heroEyebrow = $('heroEyebrowText');
  const heroPrimary = $('heroPrimaryText');
  const heroSecondary = $('heroSecondaryBtn');

  if (history.length > 0) {
    const last = history[0];
    if (last.meta.backdrop) {
      heroBg.style.backgroundImage = `url('${last.meta.backdrop}')`;
      heroBg.classList.add('has-image');
    } else {
      heroBg.style.backgroundImage = '';
      heroBg.classList.remove('has-image');
    }
    heroEyebrow.textContent = 'LAST PLAYED';
    let titleHtml = escapeHtml(last.meta.title).toUpperCase();
    if (last.meta.type === 'tv' && last.meta.season && last.meta.episode) {
      titleHtml += `<br><span style="font-size:0.6em;color:var(--cyan);">SEASON ${last.meta.season} · EPISODE ${last.meta.episode}</span>`;
    }
    heroTitle.innerHTML = titleHtml;
    heroSub.textContent = last.meta.year ? `Released ${last.meta.year}` : 'Pick up the signal';
    heroPrimary.textContent = 'RESUME';
    heroSecondary.style.display = 'inline-flex';
    $('heroPrimaryBtn').dataset.url = last.url;
  } else {
    heroBg.style.backgroundImage = '';
    heroBg.classList.remove('has-image');
    heroEyebrow.textContent = 'WELCOME PROFESSOR';
    heroTitle.innerHTML = 'PICK UP WHERE<br>YOU LEFT OFF';
    heroSub.textContent = 'Your last session waits in the neon glow';
    heroPrimary.textContent = 'OPEN CINEBY';
    heroSecondary.style.display = 'none';
    delete $('heroPrimaryBtn').dataset.url;
  }
}

// ===================
// REFRESH
// ===================
async function refreshHomeData() {
  const history = await window.api.history.get();
  const bookmarks = await window.api.bookmarks.get();

  $('continueCount').textContent = history.length.toString().padStart(2, '0');
  $('savedCount').textContent = bookmarks.length.toString().padStart(2, '0');

  const historyGrid = $('historyGrid');
  const bookmarksGrid = $('bookmarksGrid');
  historyGrid.innerHTML = '';
  bookmarksGrid.innerHTML = '';

  if (history.length === 0) {
    historyGrid.innerHTML = `<div class="empty-state"><div class="empty-icon">▣</div><p>NO TRANSMISSIONS YET</p><span>Open Cineby to begin</span></div>`;
  } else {
    history.forEach(entry => historyGrid.appendChild(renderBannerCard(entry)));
  }

  if (bookmarks.length === 0) {
    bookmarksGrid.innerHTML = `<div class="empty-state"><div class="empty-icon">★</div><p>NO SAVED CONTENT</p><span>Hit save while watching to bookmark</span></div>`;
  } else {
    bookmarks.forEach(entry => bookmarksGrid.appendChild(renderBannerCard(entry, { bookmark: true })));
  }

  await updateHero();
  rebuildFocusables();
}

// ===================
// TOAST
// ===================
function showToast(message) {
  const toast = $('toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove('show'), 2400);
}

// ===================
// CONFIRM
// ===================
function showConfirm(title, message, onConfirm) {
  $('confirmTitle').textContent = title;
  $('confirmMsg').textContent = message;
  confirmCallback = onConfirm;
  confirmDialog.classList.add('active');
  setTimeout(() => { rebuildFocusables(); $('confirmCancelBtn').focus(); }, 50);
}

function hideConfirm() {
  confirmDialog.classList.remove('active');
  confirmCallback = null;
  rebuildFocusables();
}

// ===================
// SETTINGS
// ===================
function openSettings() {
  settingsModal.classList.add('active');
  setTimeout(() => { rebuildFocusables(); $('apiKeyInput').focus(); }, 50);
}

function closeSettings() {
  settingsModal.classList.remove('active');
  rebuildFocusables();
}

// ===================
// CLOCK
// ===================
function updateClock() {
  const now = new Date();
  const h = now.getHours().toString().padStart(2, '0');
  const m = now.getMinutes().toString().padStart(2, '0');
  $('clockDisplay').textContent = `${h}:${m}`;
}

// ===================
// ANDROID BACK HANDLER
// ===================
window.handleAndroidBack = function() {
  if (confirmDialog.classList.contains('active')) { hideConfirm(); return true; }
  if (settingsModal.classList.contains('active')) { closeSettings(); return true; }
  return false;
};

// ===================
// SPATIAL NAVIGATION
// ===================
let focusables = [];

function rebuildFocusables() {
  const activeModal = document.querySelector('.modal.active');
  const container = activeModal || homeScreen;
  if (!container) { focusables = []; return; }
  focusables = Array.from(container.querySelectorAll('[data-focusable]')).filter(el => el.offsetParent !== null);
}

function getFocused() {
  return document.activeElement && document.activeElement.matches('[data-focusable]') ? document.activeElement : null;
}

function focusFirst() {
  rebuildFocusables();
  if (focusables.length > 0) {
    const preferred = $('heroPrimaryBtn');
    const target = (preferred && focusables.includes(preferred)) ? preferred : focusables[0];
    target.focus();
  }
}

function navigate(direction) {
  rebuildFocusables();
  const current = getFocused();
  if (!current || focusables.length < 2) {
    if (focusables.length > 0) focusables[0].focus();
    return;
  }
  const currentRect = current.getBoundingClientRect();
  const cc = { x: currentRect.left + currentRect.width/2, y: currentRect.top + currentRect.height/2 };
  let best = null, bestScore = Infinity;
  for (const el of focusables) {
    if (el === current) continue;
    const r = el.getBoundingClientRect();
    const c = { x: r.left + r.width/2, y: r.top + r.height/2 };
    const dx = c.x - cc.x, dy = c.y - cc.y;
    let inDir = false, primary = 0, secondary = 0;
    if (direction === 'right') { inDir = dx > 8; primary = dx; secondary = Math.abs(dy); }
    else if (direction === 'left') { inDir = dx < -8; primary = -dx; secondary = Math.abs(dy); }
    else if (direction === 'down') { inDir = dy > 8; primary = dy; secondary = Math.abs(dx); }
    else if (direction === 'up') { inDir = dy < -8; primary = -dy; secondary = Math.abs(dx); }
    if (!inDir) continue;
    const score = primary + secondary * 2;
    if (score < bestScore) { bestScore = score; best = el; }
  }
  if (best) {
    best.focus();
    best.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
  }
}

// ===================
// INIT
// ===================
document.addEventListener('DOMContentLoaded', async () => {
  tmdbApiKey = await window.api.config.getApiKey();
  startUrl = await window.api.config.getStartUrl();
  $('apiKeyInput').value = tmdbApiKey;
  $('startUrlInput').value = startUrl;
  $('storagePath').textContent = await window.api.config.getStoragePath();

  $('heroPrimaryBtn').addEventListener('click', () => {
    const url = $('heroPrimaryBtn').dataset.url;
    openCineby(url);
  });
  $('heroSecondaryBtn').addEventListener('click', async () => {
    const history = await window.api.history.get();
    if (history.length > 0) openCineby(history[0].url);
    else openCineby();
  });

  $('clearHistoryBtn').addEventListener('click', () => {
    showConfirm('Clear watch history?', 'All continue watching entries will be removed.', async () => {
      await window.api.history.clear();
      await refreshHomeData();
      showToast('HISTORY CLEARED');
    });
  });

  $('settingsBtn').addEventListener('click', openSettings);
  $('closeSettingsBtn').addEventListener('click', closeSettings);
  settingsModal.addEventListener('click', (e) => { if (e.target === settingsModal) closeSettings(); });

  $('saveApiKeyBtn').addEventListener('click', async () => {
    const key = $('apiKeyInput').value.trim();
    await window.api.config.setApiKey(key);
    tmdbApiKey = key;
    metaCache = {};
    $('apiKeyStatus').textContent = key ? '> KEY SAVED' : '> KEY CLEARED';
    showToast('CONFIG SAVED');
    setTimeout(() => $('apiKeyStatus').textContent = '', 3000);
  });

  $('saveStartUrlBtn').addEventListener('click', async () => {
    const url = $('startUrlInput').value.trim();
    if (url) {
      await window.api.config.setStartUrl(url);
      startUrl = url;
      showToast('URL UPDATED');
    }
  });

  $('wipeAllBtn').addEventListener('click', () => {
    showConfirm('Wipe all data?', 'History and bookmarks will be gone forever.', async () => {
      await window.api.history.clear();
      const bookmarks = await window.api.bookmarks.get();
      for (const b of bookmarks) await window.api.bookmarks.remove(b.url);
      await refreshHomeData();
      showToast('ALL DATA WIPED');
      closeSettings();
    });
  });

  $('confirmOkBtn').addEventListener('click', () => {
    if (confirmCallback) confirmCallback();
    hideConfirm();
  });
  $('confirmCancelBtn').addEventListener('click', hideConfirm);

  document.querySelectorAll('[data-nav]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-link').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const target = btn.dataset.nav;
      if (target === 'continue') $('continueSection').scrollIntoView({ behavior: 'smooth' });
      else if (target === 'saved') $('savedSection').scrollIntoView({ behavior: 'smooth' });
      else window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  await refreshHomeData();
  updateClock();
  setInterval(updateClock, 30000);
  setTimeout(() => focusFirst(), 200);

  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.key === 'ArrowRight') { navigate('right'); e.preventDefault(); }
    else if (e.key === 'ArrowLeft') { navigate('left'); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { navigate('up'); e.preventDefault(); }
    else if (e.key === 'ArrowDown') { navigate('down'); e.preventDefault(); }
    else if (e.key === 'Enter' || e.key === ' ') {
      const focused = getFocused();
      if (focused) { focused.click(); e.preventDefault(); }
    }
    else if (e.key === 'Escape') { window.handleAndroidBack(); e.preventDefault(); }
    else if (e.key === 'ContextMenu' || e.keyCode === 82) {
      window.saveCurrentFromAndroid();
      e.preventDefault();
    }
  });
});
