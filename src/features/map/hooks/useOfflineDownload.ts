/**
 * useOfflineDownload — one-tap "download visible area" hook.
 *
 * Composition:
 *   - Reads the current visible bounds via the supplied `MapViewRef`.
 *   - Calls `OfflineMapManager.downloadVisibleArea` with a fresh,
 *     timestamped pack name so repeated taps accumulate offline regions.
 *   - Streams native progress through `OfflineProgressListener` into
 *     React state so an overlay can render a 0..1 bar.
 *   - Cleans up listeners on unmount and on completion.
 */

import {useCallback, useEffect, useMemo, useRef, useState} from 'react';

import {type MapViewRef} from '@maplibre/maplibre-react-native';

import {
  MAP_STYLE_URL_VARIANTS,
  OFFLINE_PREFETCH_DEFAULTS,
  type MapStyleVariant,
} from '../../../core/constants/map';
import {log} from '../../../core/logger/Logger';
import {
  OfflineMapManager,
  OfflinePackState,
  buildPackName,
  type OfflinePackProgress,
} from '../../../modules/offline';

export const OfflineDownloadStatus = {
  Idle: 'IDLE',
  Working: 'WORKING',
  Complete: 'COMPLETE',
  Errored: 'ERRORED',
} as const;
export type OfflineDownloadStatus =
  (typeof OfflineDownloadStatus)[keyof typeof OfflineDownloadStatus];

export interface UseOfflineDownloadState {
  readonly status: OfflineDownloadStatus;
  readonly progress: number;
  readonly tilesCompleted: number;
  readonly tilesRequired: number;
  readonly bytes: number;
  readonly error: string | null;
  readonly activePackName: string | null;
}

export interface UseOfflineDownload extends UseOfflineDownloadState {
  /** Trigger a download of the currently-visible viewport. No-op while busy. */
  downloadVisible(opts?: {
    minZoom?: number;
    maxZoom?: number;
    styleVariant?: MapStyleVariant;
  }): Promise<void>;
  /** Reset the overlay back to idle (use after the pilot acknowledges). */
  reset(): void;
}

interface UseOfflineDownloadOpts {
  readonly mapViewRef: React.RefObject<MapViewRef | null>;
}

const ZERO_STATE: UseOfflineDownloadState = {
  status: OfflineDownloadStatus.Idle,
  progress: 0,
  tilesCompleted: 0,
  tilesRequired: 0,
  bytes: 0,
  error: null,
  activePackName: null,
};

export function useOfflineDownload({
  mapViewRef,
}: UseOfflineDownloadOpts): UseOfflineDownload {
  const [state, setState] = useState<UseOfflineDownloadState>(ZERO_STATE);
  const inFlight = useRef<boolean>(false);
  const mounted = useRef<boolean>(true);

  useEffect(() => {
    mounted.current = true;
    OfflineMapManager.init();
    return () => {
      mounted.current = false;
    };
  }, []);

  const downloadVisible = useCallback(
    async (opts?: {
      minZoom?: number;
      maxZoom?: number;
      styleVariant?: MapStyleVariant;
    }) => {
      if (inFlight.current) {
        log.map.warn('offline.download.skip', {reason: 'in-flight'});
        return;
      }
      const ref = mapViewRef.current;
      if (!ref) {
        log.map.warn('offline.download.skip', {reason: 'no-ref'});
        return;
      }
      inFlight.current = true;
      const minZoom = opts?.minZoom ?? OFFLINE_PREFETCH_DEFAULTS.minZoom;
      const maxZoom = opts?.maxZoom ?? OFFLINE_PREFETCH_DEFAULTS.maxZoom;
      const styleVariant = opts?.styleVariant ?? 'satellite';
      const styleURL = MAP_STYLE_URL_VARIANTS[styleVariant];

      try {
        const visible = await ref.getVisibleBounds();
        const ne = visible[0] as [number, number];
        const sw = visible[1] as [number, number];
        const name = buildPackName('viewport');

        if (mounted.current) {
          setState({
            status: OfflineDownloadStatus.Working,
            progress: 0,
            tilesCompleted: 0,
            tilesRequired: 0,
            bytes: 0,
            error: null,
            activePackName: name,
          });
        }

        await OfflineMapManager.downloadVisibleArea(
          {
            name,
            styleURL,
            bounds: {ne, sw},
            minZoom,
            maxZoom,
            metadata: {
              createdAt: Date.now(),
              minZoom,
              maxZoom,
              ne,
              sw,
              styleVariant,
            },
          },
          (p: OfflinePackProgress) => {
            if (!mounted.current) {
              return;
            }
            setState(prev => ({
              ...prev,
              status:
                p.state === OfflinePackState.Complete
                  ? OfflineDownloadStatus.Complete
                  : OfflineDownloadStatus.Working,
              progress: p.progress,
              tilesCompleted: p.completedTileCount,
              tilesRequired: p.requiredTileCount,
              bytes: p.completedBytes,
              activePackName: p.name,
            }));
          },
          err => {
            if (!mounted.current) {
              return;
            }
            setState(prev => ({
              ...prev,
              status: OfflineDownloadStatus.Errored,
              error: err.message,
            }));
          },
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        log.map.error('offline.download.failed', {message});
        if (mounted.current) {
          setState(prev => ({
            ...prev,
            status: OfflineDownloadStatus.Errored,
            error: message,
          }));
        }
      } finally {
        inFlight.current = false;
      }
    },
    [mapViewRef],
  );

  const reset = useCallback(() => {
    if (inFlight.current) {
      return;
    }
    setState(ZERO_STATE);
  }, []);

  return useMemo(
    () => ({
      ...state,
      downloadVisible,
      reset,
    }),
    [state, downloadVisible, reset],
  );
}
