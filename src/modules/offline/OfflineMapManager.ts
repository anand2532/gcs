/**
 * OfflineMapManager.
 *
 * A thin, typed wrapper around MapLibre's native `OfflineManager`. The rest
 * of the app NEVER imports `@maplibre/maplibre-react-native` for offline
 * concerns — it goes through this seam.
 *
 * Why this seam:
 *   1. We control the input shape (`OfflineBounds`, `OfflineDownloadOptions`)
 *      and never leak `OfflinePack`/`OfflinePackStatus` natives. That keeps
 *      Phase 2's region-manager UI decoupled from MapLibre internals.
 *   2. We translate the native progress shape (which arrives as raw event
 *      payloads from the bridge) into a tiny, public progress type before
 *      it touches React.
 *   3. We can swap the underlying provider (Mapbox, ArcGIS Runtime, or our
 *      own MBTiles loader) without changing call sites.
 *
 * Lifetime: this module is a singleton. `init()` is idempotent and is
 * called from app boot; safe to call multiple times.
 */

import {
  OfflineManager,
  OfflinePackDownloadState,
} from '@maplibre/maplibre-react-native';

import {
  OfflinePackState,
  type OfflineDownloadOptions,
  type OfflineErrorListener,
  type OfflinePackInfo,
  type OfflinePackProgress,
  type OfflineProgressListener,
} from './types';
import {
  MAP_AMBIENT_CACHE_BYTES,
  MAP_CACHE_TILE_LIMIT,
} from '../../core/constants/map';
import {log} from '../../core/logger/Logger';


interface NativePackStatus {
  readonly name: string;
  readonly state: number | string;
  readonly percentage?: number;
  readonly completedResourceCount?: number;
  readonly completedResourceSize?: number;
  readonly completedTileCount?: number;
  readonly completedTileSize?: number;
  readonly requiredResourceCount?: number;
}

interface NativePack {
  readonly name?: string | null;
  readonly bounds?: unknown;
  readonly metadata?: Record<string, unknown> | null;
  status?(): Promise<NativePackStatus>;
}

class OfflineMapManagerImpl {
  private initialized = false;

  /** Idempotent boot. Sets the global tile limit + ambient cache cap. */
  init(): void {
    if (this.initialized) {
      return;
    }
    this.initialized = true;
    try {
      OfflineManager.setTileCountLimit(MAP_CACHE_TILE_LIMIT);
      OfflineManager
        .setMaximumAmbientCacheSize(MAP_AMBIENT_CACHE_BYTES)
        .catch(() => undefined);
      OfflineManager.setProgressEventThrottle(250);
      log.map.info('offline.init', {
        tileLimit: MAP_CACHE_TILE_LIMIT,
        ambientBytes: MAP_AMBIENT_CACHE_BYTES,
      });
    } catch (err) {
      log.map.warn('offline.init failed', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  /**
   * Pre-fetches all tiles for the given bounding box at zooms `[minZoom,
   * maxZoom]`. The pack is registered under `opts.name`; if a pack with
   * that name already exists the call rejects (the caller should pick a
   * unique timestamp suffix — see `useOfflineDownload`).
   *
   * @returns a promise that resolves once `progressListener` reports the
   * Complete state. Native progress events fire continuously until then.
   */
  async downloadVisibleArea(
    opts: OfflineDownloadOptions,
    progressListener: OfflineProgressListener,
    errorListener?: OfflineErrorListener,
  ): Promise<void> {
    this.init();
    if (!opts.name) {
      throw new Error('OfflineMapManager.downloadVisibleArea: name required');
    }
    if (!opts.styleURL) {
      throw new Error('OfflineMapManager.downloadVisibleArea: styleURL required');
    }
    if (!isValidBounds(opts)) {
      throw new Error('OfflineMapManager.downloadVisibleArea: invalid bounds');
    }
    if (opts.minZoom < 0 || opts.maxZoom > 22 || opts.minZoom > opts.maxZoom) {
      throw new Error(
        `OfflineMapManager.downloadVisibleArea: invalid zoom range ${opts.minZoom}..${opts.maxZoom}`,
      );
    }

    log.map.event('offline.download.start', {
      name: opts.name,
      ne: opts.bounds.ne,
      sw: opts.bounds.sw,
      minZoom: opts.minZoom,
      maxZoom: opts.maxZoom,
    });

    return new Promise<void>((resolve, reject) => {
      let settled = false;
      const settle = (fn: () => void): void => {
        if (settled) {
          return;
        }
        settled = true;
        fn();
      };

      OfflineManager.createPack(
        {
          name: opts.name,
          styleURL: opts.styleURL,
          minZoom: opts.minZoom,
          maxZoom: opts.maxZoom,
          bounds: [opts.bounds.ne, opts.bounds.sw],
          metadata: opts.metadata,
        },
        (_pack, status) => {
          const mapped = mapStatus(status as unknown as NativePackStatus);
          progressListener(mapped);
          if (mapped.state === OfflinePackState.Complete) {
            log.map.event('offline.download.complete', {
              name: mapped.name,
              tiles: mapped.completedTileCount,
              bytes: mapped.completedBytes,
            });
            settle(resolve);
          }
        },
        (_pack, err) => {
          const message = err?.message ?? 'offline pack failed';
          log.map.error('offline.download.error', {
            name: opts.name,
            message,
          });
          errorListener?.({name: opts.name, message});
          settle(() => reject(new Error(message)));
        },
      ).catch(err => {
        const message = err instanceof Error ? err.message : String(err);
        log.map.error('offline.createPack threw', {
          name: opts.name,
          message,
        });
        errorListener?.({name: opts.name, message});
        settle(() => reject(err instanceof Error ? err : new Error(message)));
      });
    });
  }

  async list(): Promise<OfflinePackInfo[]> {
    this.init();
    try {
      const packs = (await OfflineManager.getPacks()) as NativePack[];
      return packs.map(toPackInfo).filter(p => Boolean(p.name)) as OfflinePackInfo[];
    } catch (err) {
      log.map.warn('offline.list failed', {
        error: err instanceof Error ? err.message : String(err),
      });
      return [];
    }
  }

  async delete(name: string): Promise<void> {
    if (!name) {
      return;
    }
    this.init();
    try {
      await OfflineManager.deletePack(name);
      log.map.event('offline.delete', {name});
    } catch (err) {
      log.map.warn('offline.delete failed', {
        name,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  /** Erase the *ambient* cache only (named packs survive). */
  async clearAmbient(): Promise<void> {
    this.init();
    try {
      await OfflineManager.clearAmbientCache();
      log.map.event('offline.clear-ambient');
    } catch (err) {
      log.map.warn('offline.clearAmbient failed', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  /**
   * Generates a deterministic-yet-unique pack name. We don't expose this
   * publicly because callers can pass any name; this is the default the
   * "Download visible area" hook uses.
   */
  static buildPackName(prefix = 'visible'): string {
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    return `${prefix}_${ts}`;
  }
}

function isValidBounds(opts: OfflineDownloadOptions): boolean {
  const {ne, sw} = opts.bounds;
  if (!Array.isArray(ne) || !Array.isArray(sw)) {
    return false;
  }
  const [neLng, neLat] = ne;
  const [swLng, swLat] = sw;
  if (
    !Number.isFinite(neLng) ||
    !Number.isFinite(neLat) ||
    !Number.isFinite(swLng) ||
    !Number.isFinite(swLat)
  ) {
    return false;
  }
  if (neLat <= swLat || neLng <= swLng) {
    return false;
  }
  if (neLat > 90 || swLat < -90 || neLng > 180 || swLng < -180) {
    return false;
  }
  return true;
}

function mapStatus(s: NativePackStatus): OfflinePackProgress {
  const name = s.name;
  const required = s.requiredResourceCount ?? 0;
  const tilesDone = s.completedTileCount ?? 0;
  const bytes = s.completedTileSize ?? s.completedResourceSize ?? 0;

  let progress = 0;
  if (typeof s.percentage === 'number') {
    progress = s.percentage > 1 ? s.percentage / 100 : s.percentage;
  } else if (required > 0) {
    progress = (s.completedResourceCount ?? 0) / required;
  }
  progress = Math.max(0, Math.min(1, progress));

  return {
    name,
    state: nativeStateToPublic(s.state),
    progress,
    completedTileCount: tilesDone,
    requiredTileCount: required,
    completedBytes: bytes,
  };
}

function nativeStateToPublic(s: NativePackStatus['state']): OfflinePackProgress['state'] {
  if (
    OfflinePackDownloadState &&
    typeof OfflinePackDownloadState === 'object'
  ) {
    if (s === OfflinePackDownloadState.Complete) {
      return OfflinePackState.Complete;
    }
    if (s === OfflinePackDownloadState.Active) {
      return OfflinePackState.Active;
    }
    if (s === OfflinePackDownloadState.Inactive) {
      return OfflinePackState.Inactive;
    }
  }
  if (s === 2 || s === 'complete' || s === 'COMPLETE') {
    return OfflinePackState.Complete;
  }
  if (s === 1 || s === 'active' || s === 'ACTIVE') {
    return OfflinePackState.Active;
  }
  return OfflinePackState.Inactive;
}

function toPackInfo(p: NativePack): OfflinePackInfo {
  const meta =
    p.metadata && typeof p.metadata === 'object' ? p.metadata : undefined;
  const name = (meta?.name as string | undefined) ?? p.name ?? '';
  return {
    name,
    metadata: meta,
  };
}

export const OfflineMapManager = new OfflineMapManagerImpl();
export const buildPackName = OfflineMapManagerImpl.buildPackName;
