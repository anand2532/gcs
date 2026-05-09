# Mission safety validation

**`validateMissionOperational`** (`safety-validation/missionOperationalValidator.ts`) is the unified synchronous entry point for:

1. **Geometry / draft rules** — existing `validateDraft` from mission planning (turn spacing, closure, etc.).
2. **Airspace** — `pointInRestrictedAirspace` against active GeoJSON plus bundled samples.
3. **Geofence** — `geofenceEngine.evaluateMissionCorridor` for waypoint paths.
4. **Terrain placeholder** — `FlatTerrainProvider` (sea-level) reserved for future DEM-backed cautions.

## Outputs

Issues use extended `MissionValidationIssue.code` values such as `AIRSPACE_RESTRICTED`, `GEOFENCE_VIOLATION`, `NO_FLY_INTERSECTION`, and `TERRAIN_CAUTION` (`src/core/types/missionPlanning.ts`).

## Integration

- **Mission planning hook** — `useMissionPlanning` calls `validateMissionOperational` so the planner sees the same classes of issues as future arm/preflight gates.

## Limitations

Overlays and validators **assist** the operator only. They do **not** replace legal clearance, NOTAM review, or jurisdiction-specific rules.
