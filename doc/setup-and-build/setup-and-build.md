# Setup and build

This guide walks through **cloning the repo**, **installing dependencies**, **configuring native toolchains**, and **running or building** the GCS React Native app. For day-to-day habits (lint, tests, Metro ports, devices), see [development-workflow.md](../development-workflow.md). For versioning and releases, see the same doc.

## Prerequisites

| Requirement | Notes |
|-------------|--------|
| **Node.js** | `>= 20` (matches CI and `package.json` `engines`). Use `nvm`, `fnm`, or your OS package manager. |
| **npm** | Comes with Node; CI uses `npm ci` from a clean tree. |
| **Git** | Any recent version. |
| **Watchman** | Recommended on macOS for Metro file watching: `brew install watchman`. Optional on Linux if file watching misbehaves. |

### Android

| Requirement | Notes |
|-------------|--------|
| **JDK 17** | Temurin or another JDK 17 distribution. `JAVA_HOME` should point at it. |
| **Android Studio** | Install Android SDK **API 34+** (project uses compileSdk 35 in Gradle; align with [android/build.gradle](../../android/build.gradle) / [`android/app/build.gradle`](../../android/app/build.gradle)). |
| **Android SDK** | Install platform-tools, build-tools, and NDK if Gradle prompts (CI installs specific packages; match versions when debugging CI). |
| **`ANDROID_HOME`** | Set to the SDK root (Android Studio → SDK location). |

### iOS (macOS only)

| Requirement | Notes |
|-------------|--------|
| **Xcode** | Current stable from the App Store; includes the iOS Simulator. |
| **CocoaPods** | Ruby environment + `pod install` under `ios/`. You can use Bundler (`bundle install` then `bundle exec pod install`) if the repo adds a `Gemfile` workflow later; today `pod install` after system Ruby/CocoaPods install is enough for local dev. |

---

## 1. Clone and install JavaScript dependencies

From the directory where you keep projects:

```bash
git clone <repository-url> gcs
cd gcs
```

Install packages:

```bash
npm install
```

For a **clean, reproducible install** (same as CI after lockfile changes):

```bash
npm ci
```

---

## 2. Environment variables

Copy the example env file and adjust if needed:

```bash
cp .env.example .env
```

`MAPTILER_KEY` (or keys documented in `.env.example`) is optional for local runs depending on which map styles you use; see [.env.example](../../.env.example) and [map-and-maplibre.md](../map-and-maplibre.md).

---

## 3. iOS native setup (macOS)

One-time per clone (or after native dependency changes):

```bash
cd ios
pod install
cd ..
```

If CocoaPods is not installed:

```bash
sudo gem install cocoapods   # or brew install cocoapods
```

Then open **`ios/GCS.xcworkspace`** in Xcode if you prefer building from the IDE.

---

## 4. Android native setup

1. Open Android Studio → SDK Manager and ensure **Android SDK Platform 34/35**, **SDK Build-Tools**, and **NDK** match what Gradle expects (see CI workflow [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) for reference versions).
2. Create or select an **Android Virtual Device (AVD)** for the emulator, or enable **USB debugging** on a physical device.

---

## 5. Run the app in development

Use **two terminals** from the repo root.

**Terminal A — Metro:**

```bash
npm run start
```

**Terminal B — launch the app:**

```bash
npm run android
# or, on macOS with iOS toolchain ready:
npm run ios
```

Alternate Metro port (when 8081 is busy):

```bash
npm run start:8082
npm run android:8082
```

**Physical Android phone over USB** (no emulator), after `adb devices`:

```bash
npm run android:phone
```

See [development-workflow.md](../development-workflow.md) for `adb reverse`, `device:prep`, and multi-device behavior.

---

## 6. Quality gate (before PRs)

Runs ESLint, TypeScript check, and Jest:

```bash
npm run validate
```

---

## 7. Building binaries

### Android APK (debug)

From repo root, after `npm install` / `npm ci`:

```bash
cd android
./gradlew assembleDebug
```

Debug APK path (typical):

`android/app/build/outputs/apk/debug/app-debug.apk`

### iOS (Simulator / local)

From Xcode: select the **GCS** scheme, a simulator destination, and **Product → Build**.

From CLI (example):

```bash
xcodebuild -workspace ios/GCS.xcworkspace -scheme GCS -configuration Debug \
  -sdk iphonesimulator -destination 'platform=iOS Simulator,name=iPhone 16' build
```

Adjust simulator name to one installed on your Mac (`xcrun simctl list devices`).

CI builds use a resolver script in [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml); local builds can use a fixed simulator name.

---

## 8. Version strings and native projects

The app version comes from root [`package.json`](../../package.json). Android and Xcode metadata must stay in sync:

```bash
npm run version:sync    # write native files from package.json
npm run version:verify  # read-only check
```

Details: [development-workflow.md — Releases and versioning](../development-workflow.md#releases-and-versioning).

---

## Related documentation

| Doc | Topic |
|-----|--------|
| [development-workflow.md](../development-workflow.md) | validate, Metro ports, adb, releases |
| [contributing.md](../contributing.md) | PRs, CI, branch conventions |
| [libraries.md](../libraries.md) | npm packages |
| [architecture.md](../architecture.md) | Code layout |
