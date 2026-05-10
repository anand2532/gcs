# Telemetry pipeline

## Components

### TelemetryBus (`src/modules/telemetry/TelemetryBus.ts`)

- Typed pub/sub for `TelemetryFrame`.
- Framework-free (no React/Zustand imports).
- Keeps the **last frame** so late subscribers hydrate immediately.
- Handlers run synchronously; expensive work must defer (`requestAnimationFrame` / microtasks) per module comments.

### TelemetryStore (`src/modules/telemetry/TelemetryStore.ts`)

- Zustand store with `subscribeWithSelector`.
- **`bindBusToStore()`** (called once from app entry) subscribes the bus and calls `applyFrame` on each publish.
- Selectors should be **narrow** (e.g. `s => s.armed`) to limit re-renders.

### TelemetryWatchdog (`src/modules/telemetry/TelemetryWatchdog.ts`)

- `setInterval`-driven freshness check against last frame timestamp.
- Updates `ConnectionState` (`Idle`, `Sim`, `Live`, `Stale`, `Lost`) — same UX path whether sim or future live link.

### TelemetrySourceRegistry (`src/modules/telemetry/TelemetrySourceRegistry.ts`)

- Holds the active `TelemetrySource` (today: simulation engine).
- **`attach`** replaces source; **`startActive`** starts publishing.

### Simulation engine (`src/modules/simulation/SimulationEngine.ts`)

- Publishes `TelemetryFrame`s on the **same** `telemetryBus` as live sources (`TelemetrySourceKind.Simulation`).
- Tick loop uses `setInterval` (not `requestAnimationFrame`) so timing stays deterministic vs UI pauses.
- **Synthetic link modeling** (`shouldDropCurrentFrame`, latency `setTimeout`s, optional `setForceLinkOutage`) can suppress individual publishes — but **mission completion is authoritative**: on the tick where `MissionRunner` reaches `MissionPhase.Complete`, the engine **must not** treat a synthetic drop as “skip this tick entirely.” Otherwise `SimRunState` can remain `Running` while the runner is already `Complete`, leaving the interval armed (stuck sim / resource churn). The implementation skips the drop gate only when `runner.isComplete() && state === Running` (terminal transition).
- Regression coverage: `__tests__/simulationMissionCompletion.test.ts` (includes **full frame loss** via `setForceLinkOutage(true)`).

## HUD path (`src/ui/HUD/HudBar.tsx`)

- Subscribes via `useTelemetryStore.subscribe` with **equality** on `frame` reference + `armed`, combined with **`trailingThrottle`** to cap redraw rate (`HUD_REDRAW_HZ`).

## Map ornaments

- **`DroneMarker`** — subscribes directly to `telemetryBus` (not the store) to avoid React committing every frame through Zustand; **coordinate** updates are trailing-throttled to `DRONE_MARKER_POSITION_MAX_HZ` (`src/core/constants/map.ts`).
- **`FlightTrail`** — bus subscription; ShapeSource updates are **throttled** (`FLIGHT_TRAIL_REDRAW_MAX_HZ` in `src/core/constants/map.ts`).
- **`useMapCamera`** — follow mode uses bus + **throttled** `setCamera` (`FOLLOW_CAMERA_MAX_HZ`) to limit bridge traffic when sim tick rate is high.

## Live MAVLink source

The MAVLink UDP ingress (`MavlinkTelemetrySource` in `src/communication/`) implements `TelemetrySource`, publishes `TelemetryFrame`s with `source: MAVLINK`, and registers via `telemetrySourceRegistry`. HUD/map contracts stay unchanged. See **[communication.md](communication.md)** for transports, command ACK pipeline, and stubs (USB / Bluetooth / MQTT).
