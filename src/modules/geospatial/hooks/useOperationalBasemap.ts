import {useCallback, useEffect, useMemo, useState} from 'react';

import {
  addEventListener as netInfoSubscribe,
  type NetInfoState,
} from '@react-native-community/netinfo';

import {
  MAP_STYLE_URL_VARIANTS,
  type MapStyleVariant,
  MAP_STYLE_CYCLE_ORDER,
} from '../../../core/constants/map';
import {resolveEffectiveBasemap, type BasemapResolution} from '../offline-maps';

export interface OperationalBasemapState extends BasemapResolution {
  readonly online: boolean;
  readonly preferredVariant: MapStyleVariant;
}

export interface UseOperationalBasemapResult extends OperationalBasemapState {
  readonly cyclePreferredVariant: () => void;
  readonly refresh: () => Promise<void>;
}

/**
 * Connectivity-aware basemap: when offline, prefers downloaded pack styles
 * that cover the camera center; falls back to satellite.
 */
export function useOperationalBasemap(
  preferredVariant: MapStyleVariant,
  onPreferredChange: (v: MapStyleVariant) => void,
  centerLonLat: {readonly lon: number; readonly lat: number},
): UseOperationalBasemapResult {
  const [net, setNet] = useState<NetInfoState | null>(null);
  const [resolution, setResolution] = useState<BasemapResolution>(() => ({
    effectiveVariant: preferredVariant,
    styleURL: MAP_STYLE_URL_VARIANTS[preferredVariant],
    degraded: false,
  }));

  const online = Boolean(net?.isConnected && net?.isInternetReachable !== false);

  const refresh = useCallback(async () => {
    const next = await resolveEffectiveBasemap(preferredVariant, centerLonLat, online);
    setResolution(next);
  }, [preferredVariant, centerLonLat, online]);

  useEffect(() => {
    const unsub = netInfoSubscribe(setNet);
    return () => {
      unsub();
    };
  }, []);

  useEffect(() => {
    refresh().catch(() => {});
  }, [refresh]);

  const cyclePreferredVariant = useCallback(() => {
    const idx = MAP_STYLE_CYCLE_ORDER.indexOf(preferredVariant);
    const next = MAP_STYLE_CYCLE_ORDER[(idx + 1) % MAP_STYLE_CYCLE_ORDER.length]!;
    onPreferredChange(next);
  }, [preferredVariant, onPreferredChange]);

  return useMemo(
    () => ({
      ...resolution,
      preferredVariant,
      online,
      cyclePreferredVariant,
      refresh,
    }),
    [resolution, preferredVariant, online, cyclePreferredVariant, refresh],
  );
}
