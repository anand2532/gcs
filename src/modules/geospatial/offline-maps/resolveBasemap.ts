/**
 * Chooses an effective basemap variant when connectivity or offline packs
 * constrain the preferred operator style.
 */

import {type MapStyleVariant, MAP_STYLE_URL_VARIANTS} from '../../../core/constants/map';
import {OfflineMapManager} from '../../offline';
import {type OfflinePackInfo} from '../../offline/types';

export interface BasemapResolution {
  readonly effectiveVariant: MapStyleVariant;
  readonly styleURL: string;
  readonly degraded: boolean;
  readonly reason?: 'offline_fallback' | 'offline_pack_mismatch';
}

export function pointInBounds(
  lon: number,
  lat: number,
  ne: readonly [number, number],
  sw: readonly [number, number],
): boolean {
  const [neLon, neLat] = ne;
  const [swLon, swLat] = sw;
  return lon >= swLon && lon <= neLon && lat >= swLat && lat <= neLat;
}

function metaBounds(meta: Record<string, unknown> | undefined): {
  ne: [number, number];
  sw: [number, number];
} | null {
  if (!meta) {
    return null;
  }
  const ne = meta.ne as unknown;
  const sw = meta.sw as unknown;
  if (
    !Array.isArray(ne) ||
    !Array.isArray(sw) ||
    ne.length < 2 ||
    sw.length < 2
  ) {
    return null;
  }
  const neT = ne as [number, number];
  const swT = sw as [number, number];
  if (
    !neT.every(Number.isFinite) ||
    !swT.every(Number.isFinite)
  ) {
    return null;
  }
  return {ne: neT, sw: swT};
}

function variantFromMeta(
  meta: Record<string, unknown> | undefined,
): MapStyleVariant | undefined {
  const v = meta?.styleVariant;
  if (
    v === 'satellite' ||
    v === 'hybrid' ||
    v === 'street' ||
    v === 'terrain' ||
    v === 'tactical'
  ) {
    return v;
  }
  return undefined;
}

/**
 * When offline, prefer a downloaded pack whose bounds cover `center` and
 * whose style matches `preferred`; otherwise first covering pack; finally
 * satellite as widest baseline.
 */
export async function resolveEffectiveBasemap(
  preferred: MapStyleVariant,
  center: {readonly lon: number; readonly lat: number},
  online: boolean,
): Promise<BasemapResolution> {
  const url = MAP_STYLE_URL_VARIANTS[preferred];
  if (online) {
    return {
      effectiveVariant: preferred,
      styleURL: url,
      degraded: false,
    };
  }

  const packs = await OfflineMapManager.list();
  const covering = filterCoveringPacks(packs, center);

  const preferredPack = covering.find(
    p => variantFromMeta(p.metadata as Record<string, unknown> | undefined) === preferred,
  );
  if (preferredPack) {
    const pv =
      variantFromMeta(preferredPack.metadata as Record<string, unknown>) ??
      preferred;
    return {
      effectiveVariant: pv,
      styleURL: MAP_STYLE_URL_VARIANTS[pv],
      degraded: false,
    };
  }

  if (covering.length > 0) {
    const first = covering[0]!;
    const pv =
      variantFromMeta(first.metadata as Record<string, unknown>) ??
      'satellite';
    return {
      effectiveVariant: pv,
      styleURL: MAP_STYLE_URL_VARIANTS[pv],
      degraded: pv !== preferred,
      reason: 'offline_pack_mismatch',
    };
  }

  return {
    effectiveVariant: 'satellite',
    styleURL: MAP_STYLE_URL_VARIANTS.satellite,
    degraded: true,
    reason: 'offline_fallback',
  };
}

function filterCoveringPacks(
  packs: readonly OfflinePackInfo[],
  center: {readonly lon: number; readonly lat: number},
): OfflinePackInfo[] {
  const out: OfflinePackInfo[] = [];
  for (const p of packs) {
    const meta = p.metadata as Record<string, unknown> | undefined;
    const b = metaBounds(meta);
    if (!b) {
      continue;
    }
    if (pointInBounds(center.lon, center.lat, b.ne, b.sw)) {
      out.push(p);
    }
  }
  return out;
}
