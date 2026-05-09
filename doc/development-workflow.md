# Development workflow

## Quality gate

Before pushing or cutting a build, run:

```bash
npm run validate
```

This runs **ESLint**, **TypeScript** (`tsc --noEmit`), and **Jest** in one band (`lint` → `typecheck` → `test --runInBand`).

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
