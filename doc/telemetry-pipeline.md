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

## HUD path (`src/ui/HUD/HudBar.tsx`)

- Subscribes via `useTelemetryStore.subscribe` with **equality** on `frame` reference + `armed`, combined with **`trailingThrottle`** to cap redraw rate (`HUD_REDRAW_HZ`).

## Map ornaments

- **`DroneMarker`** — subscribes directly to `telemetryBus` (not the store) to avoid React committing every frame through Zustand.
- **`FlightTrail`** — bus subscription; ShapeSource updates are **throttled** (`FLIGHT_TRAIL_REDRAW_MAX_HZ` in `src/core/constants/map.ts`).
- **`useMapCamera`** — follow mode uses bus + **throttled** `setCamera` (`FOLLOW_CAMERA_MAX_HZ`) to limit bridge traffic when sim tick rate is high.

## Future sources

MAVLink/MQTT bridges will implement `TelemetrySource`, call `telemetryBus.publish`, and register with `telemetrySourceRegistry` — no changes required to HUD/map contracts beyond connection metadata.
