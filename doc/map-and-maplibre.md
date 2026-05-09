# Map and MapLibre

## Stack

- **`@maplibre/maplibre-react-native`** — Map view, camera, shape sources, marker views.
- Styles are **inline JSON** (satellite / hybrid) using ESRI XYZ raster tiles; URLs also mirrored under `android/app/src/main/assets/styles/` for offline pack creation consistency.

## Main screen

`MapHomeScreen` (`src/features/map/screens/MapHomeScreen.tsx`) composes:

- **`MapView`** — Press/long-press for mission planning taps; `onCameraIdle` persists pose; `onUserPan` disables follow mode.
- **`Camera`** — Ref-driven updates from `useMapCamera`.
- **`FlightTrail`** — GeoJSON line via `ShapeSource` + `LineLayer`.
- **`MissionPlanningOverlays`** — Polygon fill/stroke, vertex circles, generated path line.
- **`DroneMarker`** — `MarkerView` + Reanimated heading arc.

## Camera hook (`useMapCamera`)

- Loads/saves camera via `MapCameraStore` / `MapFollowStore` (`src/modules/persistence/schemas.ts`).
- **Follow mode** subscribes to `telemetryBus` and calls `cameraRef.setCamera` at a **capped rate** to protect the RN/native bridge.
- **Recenter** snaps to latest bus/store position and re-enables follow.

## Performance notes

- Trail redraw and camera follow use **`trailingThrottle`** (`src/core/utils/throttle.ts`) with Hz caps in `src/core/constants/map.ts`.
- Drone marker avoids Zustand per-frame updates; heading uses **Reanimated** `SharedValue` for smooth rotation.

## Gestures

`react-native-gesture-handler` is initialized first in `App.tsx` per library requirements. Map gestures are primarily MapLibre’s native handlers; FABs and planner UI sit in absolute overlays with `pointerEvents` tuned so controls remain tappable.
