# Features overview

This document maps **operator-visible capabilities** to **source locations**. Phase 1 focuses on a single tactical map screen with simulated telemetry; future phases will add live links without rewriting this spine.

## Feature matrix

| Feature | User-facing behavior | Primary code locations |
|---------|----------------------|----------------------|
| Tactical map | Satellite/hybrid raster map, pan/zoom, ESRI-backed styles | `src/features/map/components/MapView.tsx`, `src/core/constants/map.ts` |
| Telemetry HUD | Link status, flight metrics, compass; throttled redraw | `src/ui/HUD/HudBar.tsx`, `src/modules/telemetry/` |
| UAV simulation | Deterministic tick loop publishing `TelemetryFrame`s | `src/modules/simulation/SimulationEngine.ts`, `MissionRunner.ts`, `FlightModel.ts` |
| Drone marker | Position + heading on map; bus-driven updates | `src/features/map/components/DroneMarker.tsx` |
| Flight trail | Rolling polyline from telemetry positions | `src/features/map/components/FlightTrail.tsx` |
| Camera follow | Optional follow mode + persistence of camera pose | `src/features/map/hooks/useMapCamera.ts`, `src/modules/persistence/schemas.ts` (`MapCameraStore`) |
| Mission planning | Polygon vertices, survey strip generation, preview in sim | `src/features/mission-planning/`, `src/modules/mission-planning/` |
| Offline maps | Download visible region as MapLibre offline pack | `src/modules/offline/`, `src/features/map/hooks/useOfflineDownload.ts` |
| Resilience | React error boundary, global JS handler, perf counters (dev) | `src/ui/components/AppErrorBoundary.tsx`, `src/app/runtime/installGlobalHandlers.ts`, `perfCounters.ts` |

## Out of scope (Phase 1)

 Listed in the root README: authentication, multi-tenant org UI, native MAVLink/MQTT bridges, full geofence engine, immutable audit log. The telemetry contract (`TelemetrySource`, `TelemetryBus`) is designed so those ship as **new producers** without UI forks.

## Feature development flow

1. **Domain types** live under `src/core/types/` (telemetry, geo, mission).
2. **Services** live under `src/modules/<subsystem>/` (telemetry, simulation, persistence, offline, mission-planning).
3. **Screens and feature UI** live under `src/features/<feature>/`.
4. **Shared visuals** live under `src/ui/` (theme, HUD primitives, glass panels).
5. **App shell** (`src/app/`) wires navigation and providers only—avoid putting business rules here.

See [architecture.md](architecture.md) for the full layering diagram.
