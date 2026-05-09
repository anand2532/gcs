# Architecture audit — GCS production program

This document is the **Phase 0 deliverable** for the production program: inventory of the current spine, integration seams, risk register, and prioritized backlog. It reflects the repository layout at audit time.

## 1. Executive summary

The application is a **Phase-1.5 tactical GCS spine**: map-first shell, pluggable `TelemetrySource` producers (`SimulationEngine`, MAVLink UDP), mission planning with polygon editing and operational validation (`validateMissionOperational`), telemetry terminal with filtering/virtualization, offline MapLibre packs, and a **`src/modules/geospatial/`** layer (basemap resolution, airspace store, geofence engine).

**Not production-complete:** enterprise auth/org flows were stub-only in UI; backend integration was planned separately. **Release 1** focuses on **session/API seams**, **arm safety gating**, **org policy hooks**, and **operational documentation**.

## 2. System inventory

### 2.1 Navigation and app shell

| Item | Implementation | Notes |
|------|----------------|-------|
| Root stack | [`src/app/navigation/RootNavigator.tsx`](src/app/navigation/RootNavigator.tsx) | Map home + telemetry terminal modal |
| Deep linking | Not configured | P2: universal links for mission invites |
| Providers | [`src/app/providers/AppProviders.tsx`](src/app/providers/AppProviders.tsx) | RNGH, SafeArea, theme, NavigationContainer, error boundary |

### 2.2 State management

| Domain | Store | Risk |
|--------|-------|------|
| Telemetry mirror | Zustand [`TelemetryStore`](src/modules/telemetry/TelemetryStore.ts) | Single writer via bus — good |
| Mission draft | Reducer in hook + MMKV [`MissionPlanningDraftStore`](src/modules/persistence/schemas.ts) | Versioned keys — good |
| Command center UI | [`commandCenterStore`](src/features/command-center/state/commandCenterStore.ts) | Local UI only |
| Terminal packets | Terminal stores | Ring-buffer semantics — watch memory cap |

### 2.3 Telemetry pipeline

```
TelemetrySource → TelemetryBus → TelemetryStore → HUD / map / terminal ingest
```

| Component | Path | Audit notes |
|-----------|------|-------------|
| Bus | [`TelemetryBus.ts`](src/modules/telemetry/TelemetryBus.ts) | Last-frame hydrate on subscribe |
| Watchdog | [`TelemetryWatchdog.ts`](src/modules/telemetry/TelemetryWatchdog.ts) | Stale/lost FSM for HUD |
| MAVLink | [`MavlinkTelemetrySource.ts`](src/communication/MavlinkTelemetrySource.ts) | Fusion path separate |

### 2.4 Simulation

| Path | Notes |
|------|-------|
| [`SimulationEngine.ts`](src/modules/simulation/SimulationEngine.ts) | Interval-driven ticks; arms/disarms store |
| [`MissionRunner.ts`](src/modules/simulation/MissionRunner.ts) | Waypoint progression |

**Gap:** productized **mission replay** (recorded session scrubber) is not implemented — see [simulation-replay-scope.md](simulation-replay-scope.md).

### 2.5 Mission planning and safety

| Path | Role |
|------|------|
| [`useMissionPlanning.ts`](src/features/mission-planning/hooks/useMissionPlanning.ts) | Draft state, `validateMissionOperational` |
| [`missionOperationalValidator.ts`](src/modules/geospatial/safety-validation/missionOperationalValidator.ts) | Geometry + airspace + geofence |

**Gap addressed in program:** arm / launch gating must consume validation when planning is active.

### 2.6 Map and overlays

| Path | Role |
|------|------|
| [`MapHomeScreen.tsx`](src/features/map/screens/MapHomeScreen.tsx) | Composition hub |
| [`overlayRegistry.ts`](src/modules/geospatial/map-rendering/overlayRegistry.ts) | Debounced overlay flush bus |

### 2.7 Persistence

| Path | Role |
|------|------|
| [`storage.ts`](src/modules/persistence/storage.ts) | MMKV + versioned JSON |

### 2.8 Org / auth (pre-integration)

| Path | Role |
|------|------|
| [`stubPanels.tsx`](src/features/command-center/menu/stubPanels.tsx) | Placeholder copy |

**Program:** replaced by session + organization modules and API client seams.

## 3. Risk register

| ID | Risk | Severity | Mitigation |
|----|------|----------|------------|
| R1 | Arm toggle ignores mission validation | **P0** | Gate arm when planner enabled + blocking validation issues |
| R2 | Tokens in plaintext MMKV | **P1** | Refresh token in Keychain; access token ephemeral |
| R3 | No TLS pinning | **P1** | Policy when API host fixed |
| R4 | Terminal burst RAM | **P2** | Existing caps + FlatList window — monitor |
| R5 | Long sim soak allocations | **P2** | Manual QA matrix + perf counters |

## 4. Prioritized backlog (snapshot)

### P0 — safety / ops

- ~~Operational arm gate tied to `MissionValidationResult`~~ (implemented in program)
- Explicit operator messaging when arm blocked (HUD / alert)

### P1 — integration

- Session store + secure credentials + HTTP client with bearer
- Organization context + policy sync hook → geofence/airspace stores

### P2 — UX / polish

- Landscape/tablet layout audit on map home
- Mission replay engine (see replay scope doc)

### P3 — future

- Full OIDC flow UI
- Route optimization solver

## 5. Definition of done — Release 1 (field hardening)

- `npm run validate` passes in CI
- Session module persists credentials securely; API client reads base URL + bearer
- Arm blocked when survey mission invalid under configured rules
- Architecture audit + QA matrix + replay scope docs linked from [README.md](README.md)

## 6. Non-goals for Release 1

- Full global NOTAM/TFR ingestion
- Complete MAVLink message inspector coverage matrix on device
- Guaranteed 60 FPS map — budgets measured, not promised globally
