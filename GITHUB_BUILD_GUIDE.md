# Build the APK Online with GitHub (No Software Install Needed)

I tried to build the APK directly for you but the build environment I work in is locked down and can't download Android SDK tools. Sorry about that — I really tried. But the good news: **GitHub will build it for you in the cloud for free.**

## What You're About to Do

You'll create a free GitHub account, upload this project once, and GitHub's servers will compile the APK for you in about 5 minutes. You don't install anything on your PC. After the first build, you can rebuild any time by clicking a single button.

Total time: about 15 minutes the first time, 5 minutes for any future build.

## Step by Step

### 1. Make a free GitHub account (2 minutes)

Go to github.com and sign up. Pick any username and password. You don't need to provide a credit card or anything.

### 2. Create a new repository (1 minute)

Once signed in:
- Click the **+** icon in the top right of GitHub
- Click **New repository**
- Repository name: `professors-cinema` (or whatever you want)
- Set it to **Public** (private also works, but public is simpler for free tier)
- Do NOT check "Add a README" or any other initialization options
- Click **Create repository**

### 3. Upload the project (3 minutes)

On the next page you'll see "Quick setup" with some Git commands. **Ignore all of that.** Instead, look for the link that says **"uploading an existing file"** (it's near the top, in small text).

Click that link. Then:
- Drag the entire `professors-cinema` folder onto the page, OR
- Click "choose your files" and select everything inside the `professors-cinema` folder

**Important:** Make sure the `.github` folder (which contains the workflow) actually uploads. GitHub sometimes hides files starting with a dot. After dragging, scroll down through the upload list to confirm `.github/workflows/build-apk.yml` is in there.

If `.github` didn't upload, you'll need to create the file manually:
- After the initial upload, click **Add file → Create new file**
- Name it `.github/workflows/build-apk.yml` (the slashes create the folders automatically)
- Paste the contents of the `build-apk.yml` file from my project
- Scroll down and click **Commit changes**

Once everything is uploaded:
- Scroll down on the upload page
- Add a commit message like "first upload"
- Click **Commit changes**

### 4. Watch the magic happen (5 to 10 minutes)

The moment you commit, GitHub Actions starts building automatically.

- Click the **Actions** tab at the top of your repository
- You'll see a yellow dot or running indicator next to a workflow called "Build APK"
- Click it to watch progress in real time
- It will take 5 to 10 minutes the first time (downloading Android SDK on the build server)

### 5. Download the APK

When the build turns green (a checkmark instead of the spinning yellow):

- Click on the completed workflow run
- Scroll all the way down
- Under **Artifacts**, you'll see `professors-cinema-apk`
- Click it to download a zip file
- Extract the zip, inside is `app-debug.apk`

**That's your APK!**

### 6. Install on the HY350

- Copy `app-debug.apk` to a USB drive
- Plug the USB into the HY350
- Open the file manager on the projector
- Find and tap the APK file
- Allow installation from unknown sources when prompted
- Install
- The "Professor's Cinema" icon appears in your apps list

## If the Build Fails

Sometimes the first build fails because of a small config issue. If you see a red X:

1. Click the failed run in the Actions tab
2. Click on the "build" job to see the error logs
3. **Screenshot the error and send it to me** — I'll tell you exactly what to fix

The most common first time failure is missing the Gradle wrapper. The workflow handles this automatically, but if it doesn't, the fix is one line of code.

## Making Future Changes

Want to tweak the UI? Change a color? Add a feature?

1. Edit the file directly on GitHub (click the file, click the pencil icon)
2. Commit your change
3. GitHub Actions auto rebuilds the APK
4. Download the new version from Artifacts
5. Install over the old one on the HY350

No PC software needed, ever.

## TL;DR

1. Sign up at github.com
2. New repository → upload the `professors-cinema` folder contents
3. Wait 10 minutes
4. Download APK from Actions tab → Artifacts
5. Install on HY350 via USB

That's it. The APK is free, unlimited rebuilds, and the workflow file I included does everything automatically.
