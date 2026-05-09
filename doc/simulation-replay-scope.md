# Simulation vs mission replay — scope

## Definitions

| Capability | Status | Description |
|------------|--------|-------------|
| **Simulation playback** | Implemented | `SimulationEngine` drives `TelemetryFrame`s from loaded mission presets (`MissionRunner`). Operators use **Preview in sim** from mission planning when validation passes. |
| **Polygon undo/redo** | Implemented | [`polygon-engine`](src/modules/mission-planning/polygon-engine/index.ts) undo stacks for edit geometry. |
| **Product mission replay** | **Out of scope for Release 1** | Recorded live or simulated sessions with timeline scrubber, map sync, and export — referenced as future work in command-center stubs. |

## Planned replay architecture (future)

1. **Capture:** append-only ring buffer of `TelemetryFrame` + optional MAVLink raw bytes keyed by monotonic `t`.
2. **Storage:** session files under app documents or synced via backend API.
3. **Playback:** second `TelemetrySource` implementation pushing historic frames at selectable rate.
4. **UI:** dedicated replay surface or terminal integration — not duplicated state with live link.

## Release 1 stance

Operators rely on **live/sim preview** and **terminal exports** for diagnostics; full replay remains on the roadmap pending backend and UX ownership.
