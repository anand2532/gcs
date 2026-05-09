# Simulation engine

## Purpose

The simulation engine is a **`TelemetrySource`** (`src/core/types/telemetry.ts`) that publishes synthetic `TelemetryFrame`s at a configurable tick rate. It exercises the **same code paths** as a future live link: bus → store → HUD → map.

## Key files

| File | Role |
|------|------|
| `src/modules/simulation/SimulationEngine.ts` | Tick loop (`setInterval`), frame build, synthetic latency/drops, mission loading |
| `src/modules/simulation/FlightModel.ts` | Vehicle kinematics toward waypoints |
| `src/modules/simulation/MissionRunner.ts` | Mission phases, waypoint advancement, loiter |
| `src/modules/simulation/types.ts` | `SimulationState`, presets |

## Tick strategy

- Uses **`setInterval`** (not `requestAnimationFrame`) so timing stays meaningful when the display is paused or backgrounded.
- `dt` derived from wall clock with a cap to avoid huge jumps after stalls.

## Operator controls

Map screen wires **SimControls** to `start` / `pause` / `resume` / `reset` / `loadNextMissionPreset`. Starting attaches the registry and begins publishing frames.

## Synthetic effects

- Link quality / drop simulation uses randomized dropping when latency jitter simulates poor RF (see `shouldDropCurrentFrame`, `simulatedLatencyMs`).
- **`pendingFrameTimers`** tracks delayed publishes when simulated latency > 0; cleared on `reset` / `loadMission` / preset swap where applicable.

## Mission from planner

`missionSimulationAdapter` (`src/modules/mission-planning/simulation-preview/index.ts`) converts a validated draft into a runtime `Mission` for `simulationEngine.loadMission`.
