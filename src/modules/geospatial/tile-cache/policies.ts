/**
 * Tile cache policy surfaces — native ambient limits live in
 * `src/core/constants/map.ts` (`MAP_CACHE_TILE_LIMIT`, …).
 */

export {
  MAP_CACHE_TILE_LIMIT,
  MAP_AMBIENT_CACHE_BYTES,
  MAP_PREFETCH_ZOOM_DELTA,
} from '../../../core/constants/map';

/** Eviction hint order when disk pressure tools land (native packs first). */
export const CACHE_EVICTION_PRIORITY = [
  'ambient_cache',
  'oldest_named_pack',
  'unused_region_pack',
] as const;
