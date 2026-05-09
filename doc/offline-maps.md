# Offline maps

## Module

- **`src/modules/offline/OfflineMapManager.ts`** — Initializes native `OfflineManager`, sets ambient cache limits aligned with `MAP_CACHE_TILE_LIMIT` / `MAP_AMBIENT_CACHE_BYTES` (`src/core/constants/map.ts`), creates packs for the visible bounds.
- **`src/modules/offline/types.ts`** — Progress + error typing for UI.

## Hook

**`useOfflineDownload`** (`src/features/map/hooks/useOfflineDownload.ts`) bridges MapLibre refs and exposes download progress + errors to **`OfflineProgressOverlay`**.

## UX notes

- Offline bootstrap is deferred with `requestAnimationFrame` on map mount to avoid blocking cold start (see `MapHomeScreen` comments).
- Pack creation uses the **same style URL** as the live map (`OFFLINE_STYLE_URL`) so cached tiles match runtime.

## Limitations (Phase 1)

Region downloads are operator-triggered (“download visible area”). There is no background sync service or multi-region queue UI yet.
