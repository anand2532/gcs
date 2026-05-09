# Geofence engine

The geofence subsystem defines **operator zones** (keep-in / altitude cylinders) and evaluates **points** and **mission corridors** against them.

## Core API

- **`GeofenceEngine`** (`geofence/engine.ts`) — `setZones`, `evaluatePoint`, `evaluateMissionCorridor`.
- **Zone kinds** — `Polygon`, `Circle`, `AltitudeCylinder` (`geofence/types.ts`). Horizontal containment uses `pointInPolygon` (polygons) or haversine distance (circles/cylinders). Altitude limits use optional floor/ceiling metres MSL when present on the zone.
- **Singleton** — `geofenceEngine` for app-wide evaluation; zones are populated by mission/org flows as those features land.

## Telemetry path

**`bindGeofenceTelemetryEvaluation`** (`geofence/telemetryEvaluation.ts`) subscribes to `telemetryBus`, evaluates each frame’s position with `geofenceEngine.evaluatePoint`, and logs violations via `log.map.warn('geofence.violation', …)` with **~850 ms hysteresis** per zone to reduce flicker from GPS noise.

## Spatial index

The current implementation performs a **linear scan** over zones — appropriate for hundreds of zones. For larger sets, introduce a tile grid or RBush-style index behind `setZones` without changing the public API.

## Related

- [safety-validation.md](safety-validation.md) — preflight integration with mission validation.
