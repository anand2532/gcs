# Tile cache strategy

MapLibre manages **ambient** tile cache and **offline packs** natively. This app adds **policy alignment** and **observation hooks** without duplicating the native cache implementation.

## Constants

Defined in `src/core/constants/map.ts` and re-exported from `src/modules/geospatial/tile-cache/policies.ts`:

| Constant | Role |
|----------|------|
| `MAP_CACHE_TILE_LIMIT` | Upper bound on tiles retained for offline packs / ambient behavior (native wiring via `OfflineMapManager`). |
| `MAP_AMBIENT_CACHE_BYTES` | Soft ceiling for ambient disk usage where the native API supports it. |
| `MAP_PREFETCH_ZOOM_DELTA` | Hint for prefetch / zoom-window alignment with mission UX. |

## Eviction priority

`CACHE_EVICTION_PRIORITY` is a **stub ordering** for future LRU policies (e.g. drop least-recently-used regions before the active mission’s pack). Production eviction must never delete the active mission region without explicit confirmation — see the main geospatial plan.

## Operational guidance

- Prefer **one orchestrated download queue** (`OfflineDownloadQueue`) over many overlapping pack jobs.
- Keep **style URLs stable** across app versions when possible; bump catalog/version keys when breaking geometry or sources change.
