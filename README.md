# PROFESSOR'S CINEMA — Android APK

A native Android app wrapping cineby.app with continue watching, banner art, and synthwave UI. Built specifically for the HY350 projector.

## What's Inside

Same UI as the desktop version, rebuilt for Android. The WebView hosts the synthwave home screen, an iframe loads cineby, SharedPreferences stores your watch history permanently. Designed to be controlled by the HY350 remote (D pad + OK + Back).

## Building the APK — Two Paths

### EASY PATH: Online Build (no install required)

You can build this APK without installing Android Studio at all. Use Github Actions or Github Codespaces.

The fastest service: **AppCircle, Bitrise, or Codemagic** all offer free Android builds. Upload this zip, hit build, download the APK in about 5 minutes. I recommend skipping this for now and using Android Studio because you have full control and debugging.

### THE REAL WAY: Android Studio

Total time: about 45 minutes the first time (mostly downloads).

**Step 1: Install Android Studio**

1. Go to developer.android.com/studio
2. Download for Windows (about 1 GB)
3. Run the installer. Accept all defaults. It will also download the Android SDK (~5 GB on first launch).
4. When it asks about importing settings, choose "Do not import"
5. Let it finish the initial setup (downloads more SDK pieces)

**Step 2: Open the Project**

1. Launch Android Studio
2. On the welcome screen, click **Open**
3. Navigate to and select the **professors-cinema** folder (NOT a file inside it, the whole folder)
4. Wait. The first time it opens, Gradle will sync for 5 to 15 minutes downloading dependencies. You'll see a progress bar at the bottom. Be patient.
5. If it asks to update the Gradle plugin, click "Update" and let it do its thing
6. If it shows a popup about "Trust Project," click Trust

**Step 3: Build the APK**

Once Gradle is done syncing (no more progress bars at the bottom):

1. In the top menu: **Build → Build Bundle(s) / APK(s) → Build APK(s)**
2. Wait 2 to 3 minutes for the build to complete
3. A notification appears in the bottom right: "APK(s) generated successfully"
4. Click the **locate** link in that notification
5. You'll find `app-debug.apk` in `app/build/outputs/apk/debug/`

That's your APK!

**Step 4: Install on the HY350**

You have a few options to get the APK onto the projector:

**Option A: USB drive (simplest)**
1. Copy `app-debug.apk` onto a USB drive
2. Plug the USB into the HY350
3. On the HY350, open File Manager (it has one built in)
4. Navigate to the USB drive
5. Tap the APK file
6. It will ask permission to install from unknown sources, allow it
7. Install. The "Professor's Cinema" icon appears in your app list

**Option B: Send Anywhere or similar (no USB needed)**
1. On your PC, install Send Anywhere or use sendanywhere.com
2. Upload the APK, get a 6 digit code
3. On the HY350, install Send Anywhere from the app store
4. Enter the code, download the APK
5. Tap to install

**Option C: ADB over WiFi (if you're feeling techie)**
1. Enable Developer Options on HY350: Settings → About → tap Build Number 7 times
2. Enable USB Debugging in Developer Options
3. On your PC with USB cable connected or ADB over WiFi:
   ```
   adb install app-debug.apk
   ```

## Using the App on HY350

The remote works like this:
- **D-pad arrows** → navigate around the UI (focus ring follows you)
- **OK / center button** → select the focused item
- **Back button** → return home (or close modal/dialog)
- **Menu button** → save current movie/show while watching

First time setup inside the app:
1. Open Settings (top right)
2. Paste your TMDB API key (same one from the desktop app)
3. Press OK to save
4. Press Back to close settings
5. Hit "OPEN CINEBY" and start watching

All your watch history and bookmarks save automatically and survive reboots.

## If Something Goes Wrong

**Gradle sync fails:** Usually a network issue. In Android Studio: **File → Sync Project with Gradle Files** and try again.

**Build errors about SDK version:** Open **Tools → SDK Manager**, install Android SDK Platform 34 if not already there.

**APK won't install on HY350:** Make sure "Install from unknown sources" is enabled in HY350 settings. Some firmware locks this; check Settings → Security.

**Cineby doesn't load inside the app:** Some Android WebView versions are aggressive about iframe security. If the cineby iframe is blank, send me a screenshot and we can switch to a different loading approach. There's a backup plan involving loading cineby directly in the WebView (no iframe) but it requires bigger code changes.

**Banners not showing:** Same TMDB API key issue as before. Make sure you've pasted the key in Settings.

## Building a Signed Release APK

The debug APK above works fine but expires-ish (some Android versions complain). For a real install:

1. **Build → Generate Signed Bundle / APK**
2. Choose **APK**
3. Create a new keystore (remember the password, you'll need it for updates)
4. Choose **release** build variant
5. Click Finish

The signed release APK lands in `app/release/`. This is the one you'd give to friends or upload to a personal app distribution.

## File Structure

```
professors-cinema/
├── app/
│   ├── build.gradle              app config
│   └── src/main/
│       ├── AndroidManifest.xml   permissions, launcher setup
│       ├── java/.../MainActivity.kt   the Android side
│       ├── assets/web/           the HTML/CSS/JS app (same as v2)
│       │   ├── index.html
│       │   ├── styles.css
│       │   └── renderer.js
│       └── res/                  Android resources, icons, themes
├── build.gradle                  project config
├── settings.gradle
└── gradle/                       wrapper files
```

The cool thing: any UI tweak only needs editing the files in `assets/web/`. You don't need to touch the Kotlin code at all unless you want to change Android specific behavior.
