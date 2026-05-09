# Offline map architecture

This document describes how **basemap selection**, **offline packs**, and **region bookkeeping** fit together in `src/modules/geospatial/`.

## Layers

1. **Native tile transport** — MapLibre `OfflineManager` (wrapped by `OfflineMapManager`) owns SQLite packs and ambient cache limits (`MAP_CACHE_TILE_LIMIT`, ambient bytes cap in `src/core/constants/map.ts`).
2. **Operational seam** — `resolveEffectiveBasemap` chooses an effective style URL from the operator’s preferred variant, connectivity, and whether an offline pack’s bounds contain the camera center (`offline-maps/resolveBasemap.ts`).
3. **Download orchestration** — `OfflineDownloadQueue` serializes native downloads to reduce contention; jobs carry `styleVariant` and bounds so packs align with runtime style URLs (`MAP_STYLE_URL_VARIANTS`).
4. **Catalog** — `RegionCatalog` persists named regions (MMKV): bounds, zoom range, style variant, download status, and optional byte estimates (`offline-maps/regionCatalog.ts`).

## UI integration

- **`useOperationalBasemap`** combines NetInfo connectivity with async pack listing and calls `resolveEffectiveBasemap` when the camera center or preferred variant changes (`hooks/useOperationalBasemap.ts`).
- **Map home** stores the operator’s preferred variant in `MapVariantStore`, passes the resolved `mapStyle` URL into `MapView`, and forwards `styleVariant` into offline download hooks so cached tiles match runtime.

## Principles

- Offline-first: when disconnected, prefer a pack that covers the viewport for the selected variant; degrade explicitly (`degraded` flag) rather than failing silently.
- Style URLs used at download time **must** match runtime — duplicated Android `asset://styles/*.json` mirrors must stay in sync when styles change.

## Related

- [tile-cache-strategy.md](tile-cache-strategy.md) — policy knobs and eviction notes.
- Repository [offline-maps.md](../offline-maps.md) — user-facing offline behavior.
