# Map overlay rendering and performance

Operational GeoJSON (airspace, missions, trails) must avoid **N × independent ShapeSource churn** from unrelated React subtrees.

## Overlay registry

**`MapOverlayRegistry`** (`map-rendering/overlayRegistry.ts`) provides debounced **`scheduleFlush`** + **`subscribe`** so layers can coalesce updates on a single timer (~48 ms default). **`globalOverlayRegistry`** is the shared instance for tactical overlays that need batched refresh.

### Usage pattern

1. Components that mutate overlay-heavy GeoJSON call `globalOverlayRegistry.scheduleFlush()` after local state updates.
2. A parent map shell subscribes once and applies merged GeoJSON to MapLibre — keeps object identity stable between renders where possible.

## Existing constraints

- Flight trail redraw is already throttled via `FLIGHT_TRAIL_REDRAW_MAX_HZ` (`src/core/constants/map.ts`).
- Camera-driven updates should continue to use established throttle patterns from the map feature layer.

## Future work

- GeoJSON diffing / incremental updates for very large features.
- Zoom-band simplification for airspace polygons at low zoom levels.
