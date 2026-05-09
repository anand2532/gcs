# GCS — UAV Ground Control (Mobile)

Production-grade, mobile-first ground control app for UAV operations. This
repo holds **Phase 1**: the foundational architecture, a dark tactical map
home screen, and a working simulation engine that drives the same telemetry
pipeline real MAVLink and MQTT links will plug into in later phases.

> Phase 1 is intentionally narrow in surface but real in depth — every
> Phase-1 component is what later phases will keep, not throwaway demo
> code.

**Documentation:** architecture, feature guides, libraries, and workflow notes are in **[doc/README.md](doc/README.md)**. **Contributing** (issues, PRs, review): **[doc/contributing.md](doc/contributing.md)**.

## Status

| Phase 1 module                                  | State        |
| ----------------------------------------------- | ------------ |
| Project scaffold (RN CLI, TS strict, aliases)   | Done         |
| Dark tactical theme + glass HUD                 | Done         |
| Telemetry pipeline (`TelemetrySource` contract) | Done         |
| Simulation engine (FlightModel + MissionRunner) | Done         |
| MapLibre map screen + animated drone marker     | Done         |
| Telemetry watchdog FSM (stale / lost recovery)  | Done         |
| MMKV persistence (camera, sim config)           | Done         |
| Command Center (tactical hub, entry to tools) | Done         |
| Telemetry Terminal (logs, filters, export, inspectors) | Done |
| Physical-device install (`npm run android:phone`) | Done     |
| MAVLink UDP/TCP communication layer (`src/communication`) | Done |
| Auth, mission planner UX hardening, MQTT cloud bridge, geofence | Out of scope |

### Recent additions (developer / ops tooling)

- **Telemetry Terminal** — full-screen modal from the Command Hub: categorized virtualized log stream, search and filters, JSON / text / CSV export, MAVLink and serial inspector shells, link diagnostics. While it is focused, the simulation auto-pauses (if it was running) and heavy map overlays are skipped when the map route is not focused.
- **Command Center** — glass hub opened from the HUD glyph; navigates to Telemetry Terminal and hosts stub panels for future org/mission/settings flows.
- **Mission planner strip** — dock position uses `PLANNER_TOP_DOCK = insets.top + 202` so the minimized tab clears the HUD comfortably.

## Quick start

Prerequisites:

- Node `>= 20`
- Watchman (recommended on macOS): `brew install watchman`
- Ruby + bundler + CocoaPods (iOS, macOS only)
- Java 17 (Temurin recommended) and Android Studio with Android SDK 34
- An iOS Simulator and/or Android emulator (or a connected device)

Bootstrap:

```bash
npm install
cp .env.example .env       # fill in MAPTILER_KEY for vector tiles (optional)
```

Run:

```bash
# in one terminal
npm run start

# in another terminal — pick a platform
npm run android
npm run ios          # macOS only
```

iOS additional one-time step (macOS):

```bash
cd ios && bundle install && bundle exec pod install && cd -
```

## Scripts

| Script              | Purpose                              |
| ------------------- | ------------------------------------ |
| `npm run start`     | Metro bundler                        |
| `npm run android`   | Build + launch on Android            |
| `npm run ios`       | Build + launch on iOS (macOS only)   |
| `npm run start:8082` | Metro on port 8082                   |
| `npm run android:8082` | Build + launch Android on 8082     |
| `npm run device:prep:8082` | Reset adb reverse + wire 8082 |
| `npm run android:phone` | Build/install debug APK on **USB device only** (sets `ANDROID_SERIAL`; ignores emulators) |
| `npm run typecheck` | `tsc --noEmit` over the whole tree   |
| `npm run lint`      | ESLint over `.ts/.tsx/.js/.jsx`      |
| `npm run lint:fix`  | ESLint with `--fix`                  |
| `npm run test`      | Jest                                 |
| `npm run validate`  | lint + typecheck + tests (in-band)   |
| `npm run format`    | Prettier-format every supported file |

## Architecture (Phase 1)

```
src/
├── app/                        # Composition root: providers + navigation
├── core/                       # Domain types, theme tokens, utilities, logger
│   ├── types/                  # telemetry / geo / mission domain types
│   ├── constants/              # theme, sim, map URLs
│   ├── utils/                  # geodesic math, throttle, time
│   └── logger/                 # ring-buffered structured logger (audit-ready)
├── features/
│   ├── map/                    # MapHomeScreen + map components/hooks
│   ├── command-center/         # Tactical hub overlay + navigation to tools
│   └── telemetry-terminal/     # Log stream, export, inspectors (developer-focused)
├── modules/                    # Service layer (one folder per subsystem)
│   ├── telemetry/              # bus + zustand store + watchdog FSM
│   ├── simulation/             # engine + flight model + mission runner
│   └── persistence/            # MMKV singleton + versioned schemas
└── ui/                         # Reusable presentational primitives
    ├── theme/                  # ThemeProvider + tokens
    ├── components/             # GlassPanel, StatusPill, FAB
    ├── HUD/                    # HudBar, TelemetryReadout
    └── animations/             # Easing presets
```

### Data flow

```
SimulationEngine ──┐
                   │  TelemetryFrame
                   ▼
            TelemetryBus  (typed pub/sub, framework-free)
                   │
        ┌──────────┼──────────────┬──────────────────┐
        ▼          ▼              ▼                  ▼
   TelemetryStore  Watchdog       DroneMarker        FlightTrail
   (Zustand)       (FSM)          (MarkerView)       (ShapeSource)
        │
        └──► HudBar selectors (throttled to 5 Hz)
```

The future arrows that aren't implemented yet:

- `MavlinkBridge → TelemetryBus` (Phase 4)
- `MqttClient → TelemetryBus` (Phase 4)
- `TelemetryBus → AuditLogSink` (when audit log subsystem lands)

These plug in **without touching the UI** because every producer
implements the same `TelemetrySource` contract in `src/core/types/telemetry.ts`.

### Key architectural commitments

1. **The simulation engine is just one telemetry source.** UI components
   never branch on "is this real or simulated"; they read from the bus and
   the connection state pill tells the operator which it is.
2. **Per-frame work stays off the React tree.** The drone marker subscribes
   directly to the bus and the camera updates via an imperative MapLibre
   ref. HUD numbers are React state but throttled to 5 Hz redraw.
3. **Reanimated is used surgically** — only for the drone heading rotation
   (eliminates the visible yaw "snap"), the FAB press scale, and the link
   pill pulse. We do not push 10 Hz position updates through SharedValues
   because MapLibre cannot consume them.
4. **MMKV beats AsyncStorage** for first-paint state because it's
   synchronous: the map opens at the user's last view with no re-layout.
5. **The watchdog runs in sim too.** Pause the simulator and the link pill
   moves through `SIM → STALE → LOST` exactly as it would for a real link.
6. **Logger is forward-compatible with the audit log.** Every record is a
   structured `LogRecord`; sinks subscribe via `logger.subscribe(...)`.
   When the immutable audit log ships, it wires in as one more sink.

## Native configuration that lives in `android/` and `ios/`

These are the standard one-time native setup steps for the dependencies we
introduced. They live in the platform projects; this section is a
human-readable reference.

### iOS (`ios/`)

After `pod install`, the following pods will be added automatically:

- `react-native-maplibre`
- `react-native-mmkv`
- `react-native-reanimated`
- `RNGestureHandler`
- `RNScreens`
- `RNSafeAreaContext`
- `BVLinearGradient` (transitive, only if used)
- `RNSVG`
- `RNCommunityBlur`

If your team uses **MapTiler**, drop `MAPTILER_KEY=…` into `.env`. The map
will pick the dark vector style automatically.

### Android (`android/`)

The default scaffold's Gradle config is sufficient. The new native
dependencies auto-link via React Native's autolinking. If you bump the
JVM/AGP versions in the future, also confirm Reanimated v3's compatibility.

## Tests

Core contract tests include **`telemetryPipeline.test.ts`** (bus + store seam) and **`simulationEngine.test.ts`** (simulation as `TelemetrySource`). Additional suites cover mission planning, offline maps, map persistence, telemetry terminal filters/export/diagnostics, and the Command Center store. Run everything with **`npm run validate`** or **`npm test`**.

## Android device E2E validation (Metro start to finish)

Use this when you want a deterministic full-flow verification on a physical device.

1) **Preflight quality gate**

```bash
npm run validate
```

2) **Clean device/port setup**

```bash
adb devices
npm run device:prep:8082
```

3) **Start Metro (terminal A)**

```bash
npm run start:8082
```

4) **Install + launch app (terminal B)**

```bash
npm run android:8082
```

To install **only on a physical USB device** (skip emulators), use `npm run android:phone` instead after `adb devices` shows your handset.

5) **Manual smoke flow (start to end)**
- App opens map without red-screen/reload loop.
- Tap **Start** and verify UAV movement + telemetry changes.
- Tap **Pause** and verify connection degrades to stale behavior.
- Tap **Resume** and verify link returns to SIM/live updates.
- Tap mission preset control and verify mission switches while sim is active.
- Tap **Reset** and verify idle baseline is restored.

6) **If anything fails, run this quick triage**
- Port in use: restart Metro on 8082 and re-run `npm run device:prep:8082`.
- Device not receiving bundles: re-run adb reverse prep and relaunch app.
- Intermittent reloads: confirm only one Metro is running and it is on 8082.

## Debugger kill signature and mitigation

If the app appears to close without JS crash output, inspect logcat for:
- `ActivityManager: Killing ... com.gcs ... remove task`
- `DynamicDDSService ... ACTIVITY_SUSPEND`

This indicates OEM task/battery management removed the process (not a Metro bundle crash).

Recommended mitigation:
- Exempt `com.gcs` from battery optimization/task cleaner settings on the device.
- Keep only one Metro instance active (`npm run start:8082`).
- Use `npm run android:8082` so adb reverse is reset and remapped every launch.

## What's next (rough phase plan)

| Phase | Adds                                                                        |
| ----- | --------------------------------------------------------------------------- |
| 2     | Auth shell, multi-tenant org model, RBAC selectors                          |
| 3     | Mission planner UI, geofence engine, preflight checklist                    |
| 4     | Native MAVLink bridge + MQTT client (both as `TelemetrySource`s)            |
| 5     | Mission replay, immutable audit log, offline tile manager                   |
| 6     | Emergency control system, point/zone-based authorization, weak-network UX  |

Each phase plugs into the existing Phase-1 spine. None require Phase-1
rewrites.
