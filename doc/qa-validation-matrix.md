# QA validation matrix — production hardening

Manual and automated checks aligned with the production program. Run **`npm run validate`** before every release candidate.

## Automated (CI)

| Check | Command |
|-------|---------|
| Lint | `npm run lint` |
| Typecheck | `npm run typecheck` |
| Unit tests | `npm run test -- --runInBand` |
| Android APK | CI `android_build` |
| iOS Simulator | CI `ios_build` |

## Manual — telemetry / link

| Scenario | Steps | Pass criteria |
|----------|-------|----------------|
| Sim start/stop | Map → Sim FAB → start/stop | No duplicate watchdog subscriptions; HUD updates |
| Link stale/lost | Pause sim long enough | Watchdog transitions Stale → Lost per thresholds |
| MAVLink UDP | Switch profile, inject packets | Frames flow to HUD + terminal |

## Manual — mission / safety

| Scenario | Steps | Pass criteria |
|----------|-------|----------------|
| Invalid survey arm block | Enable planner, invalidate mission (e.g. geometry error), tap ARM | Arm denied + message |
| Valid preview | Fix mission, preview in sim | Sim runs |
| Draft persistence | Edit mission, kill app, reopen | Draft restores |

## Manual — offline / map

| Scenario | Steps | Pass criteria |
|----------|-------|----------------|
| Offline pack | Download region, toggle airplane mode | Basemap degrades predictably |
| Style variants | Cycle variant FAB | Consistent style URL / pack alignment |

## Manual — long soak

| Scenario | Steps | Pass criteria |
|----------|-------|----------------|
| Sim 45–60 min | Run sim with trail + optional follow | RSS stable; perf counters linear (~trail redraws); no ANRs |

## Manual — stress

| Scenario | Steps | Pass criteria |
|----------|-------|----------------|
| Terminal burst | High log rate + filters | UI responsive; caps respected |
| Reconnect cycles | Background/foreground 5× | No crash; single telemetry subscription |

## Perf diagnostics

Dev builds may enable [`perfCounters`](../src/app/runtime/perfCounters.ts) snapshots from diagnostics panels — compare trail redraw and camera follow counts over time (super-linear growth suggests a render storm).
