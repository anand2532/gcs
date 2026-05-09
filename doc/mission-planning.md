# Mission planning

## User flow

1. Enable planning from **MissionPlanningPanel**.
2. Tap map to add polygon vertices; long-press inserts along nearest edge (when enabled).
3. Configure survey spacing, altitude, overlap from the panel.
4. Generated survey path appears as a green line overlay (`MissionPlanningOverlays`).
5. **Run preview** loads the path into the simulation engine and starts the mission (validation must pass).

## Code layout

| Area | Path |
|------|------|
| UI state hook | `src/features/mission-planning/hooks/useMissionPlanning.ts` |
| Panel + UX | `src/features/mission-planning/components/MissionPlanningPanel.tsx` |
| Map overlays | `src/features/mission-planning/components/MissionPlanningOverlays.tsx` |
| Polygon ops | `src/modules/mission-planning/polygon-engine/` |
| Survey grid | `src/modules/mission-planning/survey-engine/index.ts` |
| Validation | `src/modules/mission-planning/validation/index.ts` |
| Preview → sim | `src/modules/mission-planning/simulation-preview/index.ts` |

## Stability characteristics

- **Debounced path regeneration** — Survey path inputs debounce (`SURVEY_PATH_DEBOUNCE_MS` in `src/core/constants/missionPlanning.ts`) so rapid edits do not lock the JS thread.
- **Grid and waypoint caps** — `estimateSurveyGridCells`, `SURVEY_MAX_GRID_CELLS`, `SURVEY_MAX_PATH_POINTS` prevent pathological polygons + tight spacing from freezing the UI.
- **Stable action identities** — Mission hook exposes memoized `actions` so lifecycle effects (e.g. `AppState` persistence) do not churn subscriptions every render.

## Persistence

Draft polygon/survey saved via `MissionPlanningDraftStore`; UI minimized/placement mode via `MissionPlanningUiStore` (`src/modules/persistence/schemas.ts`).
