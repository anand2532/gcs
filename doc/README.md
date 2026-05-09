# GCS documentation

Extended documentation for the UAV ground control mobile application (`gcs`). The repository root [README.md](../README.md) covers quick start and Phase 1 scope; this directory goes deeper into **architecture**, **features**, **libraries**, and **development workflow**.

## Guides

| Document | Description |
|----------|-------------|
| [features-overview.md](features-overview.md) | Feature matrix and mapping to `src/` folders |
| [telemetry-terminal.md](telemetry-terminal.md) | Telemetry Terminal: logs, export, inspectors, perf hooks |
| [architecture.md](architecture.md) | Layers, navigation, and data flow |
| [telemetry-pipeline.md](telemetry-pipeline.md) | Bus, Zustand store, watchdog, HUD throttling |
| [simulation-engine.md](simulation-engine.md) | Sim tick loop, missions, `TelemetrySource` contract |
| [map-and-maplibre.md](map-and-maplibre.md) | MapLibre map, camera, marker, trail, overlays |
| [mission-planning.md](mission-planning.md) | Polygon editor, survey paths, validation limits |
| [persistence.md](persistence.md) | MMKV storage and versioned keys |
| [offline-maps.md](offline-maps.md) | Offline tile packs and download UX |
| [libraries.md](libraries.md) | npm dependencies and how they are used |
| [development-workflow.md](development-workflow.md) | validate script, Metro ports, adb, device checks |

## Who should read what

- **New contributors:** `architecture.md`, `development-workflow.md`, `libraries.md`.
- **Map / UX work:** `map-and-maplibre.md`, `offline-maps.md`.
- **Telemetry / simulation:** `telemetry-pipeline.md`, `simulation-engine.md`, `telemetry-terminal.md` (developer terminal UI).
- **Mission planning:** `mission-planning.md`, `persistence.md`.
