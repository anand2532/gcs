# Persistence (MMKV)

## Implementation

- **`src/modules/persistence/storage.ts`** — Thin wrapper around `react-native-mmkv` with JSON serialization and **schema versioning**. Corrupt or mismatched versions drop the record safely (logged via `Logger`).
- **`src/modules/persistence/schemas.ts`** — Named keys and typed loaders/savers for:
  - Map camera pose (`MapCameraStore`)
  - Follow-drone preference (`MapFollowStore`)
  - Map style variant (`MapVariantStore`)
  - Simulation tuning (`SimConfigStore`)
  - Mission planning draft + UI state (`MissionPlanningDraftStore`, `MissionPlanningUiStore`)

## Why MMKV

Synchronous reads enable **first paint** without async hydration flashes—camera opens where the pilot left off.

## Version bumps

When changing persisted shapes, increment the version constant for that key and document the migration behavior (typically “discard old record” for Phase 1 simplicity).
