# Development workflow

## Quality gate

Before pushing or cutting a build, run:

```bash
npm run validate
```

This runs **ESLint**, **TypeScript** (`tsc --noEmit`), and **Jest** in one band (`lint` → `typecheck` → `test --runInBand`).

## Releases and versioning

The **semantic version** lives only in root `package.json` (`version`). The app reads it via [`src/core/constants/appVersion.ts`](../src/core/constants/appVersion.ts). Android `versionName` / iOS `MARKETING_VERSION` match that string; Android `versionCode` and iOS `CURRENT_PROJECT_VERSION` use the same integer derived from semver: `major * 10000 + minor * 100 + patch` (e.g. `0.1.0` → `100`).

After changing `package.json` version, sync native projects:

```bash
npm run version:sync
```

CI runs `npm run version:verify` so Gradle and Xcode settings cannot drift from `package.json`.

**Cutting a release (Git):**

1. Bump and sync without creating a git tag yet (updates `package.json`, `package-lock.json`, Android, iOS):

   ```bash
   npm run release:patch   # or release:minor / release:major
   ```

2. Commit the changed files (version + lockfile + native), then tag and push:

   ```bash
   git add package.json package-lock.json android/app/build.gradle ios/GCS.xcodeproj/project.pbxproj
   git commit -m "chore(release): v$(node -p \"require('./package.json').version\")"
   git tag "v$(node -p \"require('./package.json').version\")"
   git push origin HEAD --follow-tags
   ```

Alternatively, use `npm version patch` (creates a commit and tag by default), then run `npm run version:sync` and amend or add a follow-up commit that includes the native files, then `git push --follow-tags`.

**APK on GitHub:** Pushing a `v*` tag runs [`.github/workflows/github-release.yml`](../.github/workflows/github-release.yml), which uploads **`gcs-android-debug.apk`** to the **GitHub Release** for that tag (not to the bare tag page). On a tag’s URL, GitHub always lists **Source code (zip)** and **Source code (tar.gz)**—that is normal and is not the CI-built APK. Open **Releases**, pick the release for your tag, and download **`gcs-android-debug.apk`** under **Assets**. The workflow file at the **tagged commit** is what runs; merge release/CI fixes to the branch you tag before cutting the tag.

## GitHub (PRs and issues)

- Use issue templates under `.github/ISSUE_TEMPLATE/` for bugs, features, and **problem / risk** items (workaround + proposed fix).
- Before opening or updating a PR to `main`, run `npm run validate`; GitHub Actions runs that gate plus Android/iOS build jobs on PRs to `main`. See [contributing.md](contributing.md#ci).
- Conventions: [contributing.md](contributing.md).

## Metro and ports

| Script | Port | Use |
|--------|------|-----|
| `npm run start` | 8081 | Default Metro. |
| `npm run start:8082` | 8082 | Optional Metro when 8081 is busy or you want isolation; kills listeners on 8081/8082 first. |

Pair Android with 8082 using **`npm run android:8082`** so Gradle launches against the same bundler port.

## Physical USB device only (no emulator)

When multiple devices are attached (emulator + phone), Gradle’s default install may push to both. To target **only** a physical handset:

```bash
adb devices          # confirm your phone serial (not emulator-*)
npm run android:phone
```

The script picks the first non-emulator device, sets `ANDROID_SERIAL`, and passes `--device` to React Native CLI. Close the emulator if you want a single unambiguous target.

## Physical Android device (adb reverse)

When the device must talk to Metro on your workstation:

```bash
adb devices
npm run device:prep:8082
```

Then start Metro (`npm run start:8082`) and in another terminal run `npm run android:8082`. This resets adb reverse rules so the device can reach the bundler reliably.

## End-to-end smoke on device

Summarized from the repository README:

1. Run `npm run validate`.
2. Clean port setup: `adb devices` then `npm run device:prep:8082`.
3. Terminal A: `npm run start:8082`.
4. Terminal B: `npm run android:8082`.
5. Manually verify: map loads; Start/Pause/Resume/Reset and mission preset behave; link pill reflects stale behavior when paused.

**Triage:** port conflicts → restart Metro on 8082 and re-run device prep; no bundles → repeat adb reverse; reload loops → single Metro on 8082.

## Debugger / OEM kills

If the app disappears without a red screen, check logcat for task removal or battery optimization killing `com.gcs`. Exempt the app from aggressive battery settings and keep a single Metro instance.
