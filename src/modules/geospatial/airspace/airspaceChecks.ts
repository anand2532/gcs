import {type AirspaceFeatureCollection} from './geojsonTypes';
import {type GeoPoint} from '../../../core/types/geo';
import {pointInPolygon} from '../../mission-planning/geometry';

function ringFromCoordinates(ring: readonly (readonly number[])[]): GeoPoint[] {
  const out: GeoPoint[] = [];
  for (const pair of ring) {
    const lon = pair[0];
    const lat = pair[1];
    if (typeof lon === 'number' && typeof lat === 'number') {
      out.push({lon, lat});
    }
  }
  return out;
}

/** True if point lies inside any polygon feature tagged RESTRICTED / NO_FLY / MILITARY. */
export function pointInRestrictedAirspace(
  p: GeoPoint,
  fc: AirspaceFeatureCollection,
): {readonly blocked: boolean; readonly label?: string} {
  for (const f of fc.features) {
    const kind = String(
      (f.properties as Record<string, unknown> | undefined)?.kind ?? '',
    ).toUpperCase();
    const restrictive =
      kind.includes('RESTRICT') ||
      kind.includes('NO_FLY') ||
      kind.includes('PROHIBIT') ||
      kind.includes('MILITARY');
    if (!restrictive) {
      continue;
    }
    const label = String(
      (f.properties as Record<string, unknown> | undefined)?.label ?? kind,
    );
    const g = f.geometry;
    const outer = g.coordinates[0];
    if (!outer) {
      continue;
    }
    const poly = ringFromCoordinates(outer);
    if (pointInPolygon(p, poly)) {
      return {blocked: true, label};
    }
  }
  return {blocked: false};
}

/** Centroid of polygon vertices — MVP conflict probe for survey AOI. */
export function polygonCentroid(poly: readonly GeoPoint[]): GeoPoint {
  if (poly.length === 0) {
    return {lat: 0, lon: 0};
  }
  let slat = 0;
  let slon = 0;
  for (const p of poly) {
    slat += p.lat;
    slon += p.lon;
  }
  return {lat: slat / poly.length, lon: slon / poly.length};
}
