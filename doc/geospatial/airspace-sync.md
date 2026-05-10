# Airspace overlays and sync

Local **vector overlays** for restricted / caution airspace are modeled as GeoJSON feature collections and rendered through a **single** MapLibre `ShapeSource` (`AirspaceOverlay`).

## Storage

- **`AirspaceStore`** merges bundled demonstration features with an optional MMKV override (`geospatial.airspace.overlay.v1`). **Map rendering** uses `getMapOverlayGeoJson()` (override features only) so the bundled demo zone does not paint a red fill on the map; **mission validation** still uses `getActiveGeoJson()` (bundled sample + overrides).
- **`SAMPLE_RESTRICTED_AIRSPACE_GEOJSON`** ships as illustrative data only — not for operational navigation or regulatory compliance.

## Restrictive classification

`pointInRestrictedAirspace` treats properties `kind` containing `RESTRICT`, `NO_FLY`, `PROHIBIT`, or `MILITARY` as blocking for mission validation. Other kinds (e.g. `ADVISORY`) may still render on the map but do not block by default.

## Sync adapter seam

**`AirspaceSyncAdapter`** (`airspace/syncAdapter.ts`) is the extension point for REST/S3/partner feeds. Implementations return `AirspaceFeatureCollection`; callers merge results into `AirspaceStore.saveOverride` or a future SQLite-backed store.

Authoritative NOTAM/TFR ingestion requires licensed data and legal review — the architecture supports adapters without assuming global coverage.

## Related

- [safety-validation.md](safety-validation.md) — how airspace intersects mission checks.
