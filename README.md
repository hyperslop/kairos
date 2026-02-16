# Building Task Manager — Desktop & Android

This guide covers building the Task Manager app for:
- **Desktop (Electron)** — Linux AppImage (NixOS-compatible), .deb, Windows, macOS
- **Android (Capacitor)** — APK for sideloading or Google Play

Both apps share the same React codebase in `packages/core/`. Edit your
components, logic, and styles there — changes apply everywhere.

---

## Project Structure

```
task-manager-multiplatform/
├── package.json              # Root scripts (convenience wrappers)
├── shell.nix                 # NixOS dev environment (all deps)
├── packages/
│   ├── core/                 # ← YOUR APP LIVES HERE (shared React code)
│   │   ├── src/
│   │   │   ├── components/   # TaskManager.jsx, TaskItem.jsx, etc.
│   │   │   ├── utils/        # dateUtils.js, notificationService.js
│   │   │   └── main.jsx
│   │   ├── package.json
│   │   └── vite.config.js
│   ├── electron/             # Desktop wrapper
│   │   ├── main.js           # Electron main process
│   │   ├── preload.js        # Bridge to renderer
│   │   ├── assets/           # App icons (you provide these)
│   │   └── package.json
│   └── android/              # Android wrapper
│       ├── capacitor.config.json
│       └── package.json
```

**The rule:** you only ever edit files in `packages/core/src/` for app logic.
The `electron/` and `android/` packages are thin shells that wrap the same build.

---

## Prerequisites

### On NixOS (Recommended)

Just enter the dev shell — everything is provided:

```bash
# From the project root
nix-shell

# Or if you use direnv, just cd into the directory
```

The `shell.nix` includes Node.js 20, JDK 17, Android SDK 34, and all the
native libraries Electron needs on NixOS (where there's no /lib64/ld-linux).

### On Other Linux / macOS / Windows

You need these installed manually:
- **Node.js 20+** and npm
- **JDK 17** (for Android builds)
- **Android Studio** or the **Android SDK** command-line tools
  - SDK Platform 34
  - Build Tools 34.0.0
  - Set `ANDROID_HOME` and `ANDROID_SDK_ROOT` environment variables
- **Android device or emulator** for testing

---

## Step 1: Install All Dependencies

```bash
# From the project root
npm run install:all
```

This runs `npm install` inside `packages/core`, `packages/electron`, and
`packages/android`.

---

## Step 2: Add Your App Icon

Place your icon in `packages/electron/assets/`:
- `icon.png` — 512×512 or 1024×1024 PNG (used for the app window and builds)
- `tray-icon.png` — 16×16 or 32×32 PNG (used for the system tray)

For Android, you'll configure the icon inside Android Studio after the
Capacitor project is generated (Step 5).

If you don't have icons yet, the app will still build and run — it'll just
use a default/empty icon.

---

## Building the Desktop App (Electron)

### Development Mode

This runs the Vite dev server and opens Electron pointing at it, with
hot-reload:

```bash
# Terminal 1: Start the Vite dev server
cd packages/core
npm run dev

# Terminal 2: Start Electron in dev mode (after Vite is running)
cd packages/electron
npm run dev
```

Or from the root (starts both):

```bash
npm run dev:electron
```

### Production Build — Linux AppImage (NixOS-Compatible)

AppImage is the best format for NixOS because it's self-contained and
doesn't depend on system library paths:

```bash
# From root
npm run build:electron:appimage

# Or from the electron package directly
cd packages/electron
npm run build:appimage
```

Output: `packages/electron/dist/Task Manager-1.0.0.AppImage`

**To run on NixOS:**

```bash
# Make it executable
chmod +x "Task Manager-1.0.0.AppImage"

# Run it (AppImage bundles its own libs, so it works on NixOS)
./"Task Manager-1.0.0.AppImage"

# If you get sandbox errors, try:
./"Task Manager-1.0.0.AppImage" --no-sandbox
```

**Alternatively, wrap it with `appimage-run`:**

```bash
# Install appimage-run if you haven't
# (add to your NixOS config or use nix-env)
nix-env -iA nixpkgs.appimage-run

appimage-run "Task Manager-1.0.0.AppImage"
```

### Production Build — .deb (Debian/Ubuntu)

```bash
cd packages/electron
npm run build:linux
```

Output: `packages/electron/dist/task-manager-desktop_1.0.0_amd64.deb`

### Production Build — Windows / macOS

```bash
cd packages/electron
npm run build:win   # .exe installer
npm run build:mac   # .dmg
```

(Cross-compilation may need extra setup — see
[electron-builder docs](https://www.electron.build/multi-platform-build).)

---

## Building the Android App (Capacitor)

### One-Time Setup

These steps create the native Android project. You only do this once:

```bash
cd packages/android

# 1. Install deps
npm install

# 2. Build the web app (Vite builds core/ into core/dist/)
npm run build:web

# 3. Initialize Capacitor (creates the android/ folder with native project)
npx cap add android
```

This creates `packages/android/android/` — the native Android Studio project.

### Building the APK

Every time you change your app:

```bash
cd packages/android

# Sync your web build into the Android project
npm run build

# Open in Android Studio to build/run
npx cap open android
```

In Android Studio:
1. **Build → Build Bundle(s) / APK(s) → Build APK(s)**
2. The APK appears in `android/app/build/outputs/apk/debug/app-debug.apk`

**Or build from the command line without Android Studio:**

```bash
cd packages/android/android

# Debug APK
./gradlew assembleDebug

# Release APK (needs signing — see below)
./gradlew assembleRelease
```

### Running on a Connected Device

```bash
cd packages/android

# Build + sync + install + launch on connected device/emulator
npx cap run android
```

### Running on an Emulator

1. Open Android Studio
2. Tools → Device Manager → Create Virtual Device
3. Select a phone (e.g., Pixel 7), download a system image, finish
4. Start the emulator
5. `npx cap run android` will detect it automatically

### Signing a Release APK

To install on a real device without Android Studio, or to publish to the
Play Store, you need a signed APK:

```bash
# 1. Generate a keystore (one-time)
keytool -genkey -v -keystore my-release-key.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias task-manager

# 2. Add to android/app/build.gradle (inside the android { } block):
#
#   signingConfigs {
#       release {
#           storeFile file('../../my-release-key.jks')
#           storePassword 'your-password'
#           keyAlias 'task-manager'
#           keyPassword 'your-password'
#       }
#   }
#   buildTypes {
#       release {
#           signingConfig signingConfigs.release
#       }
#   }

# 3. Build the release APK
cd packages/android/android
./gradlew assembleRelease
```

Output: `android/app/build/outputs/apk/release/app-release.apk`

Transfer this APK to your phone and install it (enable "Install from unknown
sources" in your phone's settings).

---

## Notifications

Notifications are **already wired in** via `packages/core/src/utils/notificationService.js`.

How it works:
- When the app starts, it requests notification permission
- Every time the task list changes, it scans for tasks with a future `date`
  (and optionally `time`) and schedules an OS-level notification
- If a task has a date but no time, the notification fires at **9:00 AM**
- Completing or deleting a task cancels its notification

### Platform behavior

| Platform          | Notification type          | App can be closed? |
|-------------------|----------------------------|--------------------|
| Electron (Linux)  | Native OS notification     | Yes (runs in tray) |
| Android           | Android notification       | Yes (background)   |
| Web browser       | Browser Notification API   | Must be open       |

### Android notification channel

On Android, notifications are posted to a channel called **"Task Reminders"**
with high importance (shows as a heads-up notification). You can customize
the channel name and behavior in `notificationService.js` in the
`requestNotificationPermission()` function.

---

## Day-to-Day Workflow

```
┌─────────────────────────────────────────────────────────┐
│ You edit files in packages/core/src/ (components, utils) │
│                         │                                │
│                    vite build                            │
│                    ┌────┴────┐                           │
│                    ▼         ▼                           │
│           packages/electron  packages/android            │
│           wraps the build    wraps the build             │
│           into Electron      into Capacitor              │
│                    │              │                      │
│                    ▼              ▼                      │
│              .AppImage         .apk                      │
│          (Linux desktop)   (Android phone)               │
└─────────────────────────────────────────────────────────┘
```

1. Make changes in `packages/core/src/`
2. Test in browser: `cd packages/core && npm run dev`
3. Test in Electron: `cd packages/electron && npm run dev`
4. Build for desktop: `npm run build:electron:appimage`
5. Build for Android: `cd packages/android && npm run build && npx cap run android`

---

## Troubleshooting

### Electron on NixOS: "No such file or directory" or GLIBC errors

This happens because NixOS doesn't have a traditional `/lib64/ld-linux-x86-64.so`.
Solutions:

1. **Use the nix-shell** — it sets `LD_LIBRARY_PATH` with all needed libs
2. **Use AppImage with `appimage-run`** — it patches the binary for NixOS
3. **Add `steam-run`** as a last resort:
   ```bash
   nix-shell -p steam-run --run "steam-run ./Task\ Manager-1.0.0.AppImage"
   ```

### Electron: Tray icon not showing

Place a 16×16 or 32×32 PNG at `packages/electron/assets/tray-icon.png`.
The app still works without it; you just won't see a tray icon.

### Android: "SDK location not found"

Make sure `ANDROID_HOME` is set. In the nix-shell, this is automatic.
Outside of nix, set it in your shell profile:

```bash
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

### Android: Notifications not appearing

1. Check that the app has notification permission (Settings → Apps → Task Manager → Notifications)
2. Check that the "Task Reminders" channel is enabled
3. On some manufacturers (Xiaomi, Samsung), you may need to disable battery optimization for the app

### Capacitor: "webDir does not exist"

You need to build the web app first:

```bash
cd packages/core
npm run build
```

This creates `packages/core/dist/` which is where Capacitor looks for the web assets.
