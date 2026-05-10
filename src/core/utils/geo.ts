/**
 * Geodesic helpers — small, pure, allocation-free where possible.
 *
 * For the small distances we deal with at the map scale (waypoint legs of
 * tens-to-hundreds of metres) the equirectangular and great-circle
 * approximations are sub-metre accurate, which is plenty for sim.
 */

import {type GeoPoint} from '../types/geo';

const EARTH_RADIUS_M = 6_371_008.8;
const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

export function toRadians(deg: number): number {
  return deg * DEG_TO_RAD;
}

export function toDegrees(rad: number): number {
  return rad * RAD_TO_DEG;
}

/**
 * Great-circle distance in metres. Haversine — accurate at all scales.
 */
export function distanceMetres(a: GeoPoint, b: GeoPoint): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLon = toRadians(b.lon - a.lon);
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRadians(a.lat)) *
      Math.cos(toRadians(b.lat)) *
      sinLon *
      sinLon;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Initial bearing from `a` to `b`, in degrees [0, 360).
 */
export function bearingDeg(a: GeoPoint, b: GeoPoint): number {
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const dLon = toRadians(b.lon - a.lon);
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return (toDegrees(Math.atan2(y, x)) + 360) % 360;
}

/**
 * Move `from` `distance` metres along `bearing` degrees. Returns a new point.
 */
export function destinationPoint(
  from: GeoPoint,
  distance: number,
  bearing: number,
): GeoPoint {
  const angularDistance = distance / EARTH_RADIUS_M;
  const lat1 = toRadians(from.lat);
  const lon1 = toRadians(from.lon);
  const brng = toRadians(bearing);

  const sinLat1 = Math.sin(lat1);
  const cosLat1 = Math.cos(lat1);
  const sinAd = Math.sin(angularDistance);
  const cosAd = Math.cos(angularDistance);

  const sinLat2 = sinLat1 * cosAd + cosLat1 * sinAd * Math.cos(brng);
  const lat2 = Math.asin(sinLat2);
  const y = Math.sin(brng) * sinAd * cosLat1;
  const x = cosAd - sinLat1 * sinLat2;
  const lon2 = lon1 + Math.atan2(y, x);

  return {
    lat: toDegrees(lat2),
    lon: ((toDegrees(lon2) + 540) % 360) - 180,
  };
}

/**
 * Smallest signed angular delta between two headings in degrees, range
 * (-180, 180]. Used by yaw rate-limiting.
 */
export function angleDeltaDeg(from: number, to: number): number {
  let delta = ((to - from + 540) % 360) - 180;
  if (delta === -180) {
    delta = 180;
  }
  return delta;
}

/** True when both values are finite numbers suitable for MapLibre / GeoJSON (MarkerView, Camera). */
export function isFiniteLngLat(lon: unknown, lat: unknown): boolean {
  return (
    typeof lon === 'number' &&
    typeof lat === 'number' &&
    Number.isFinite(lon) &&
    Number.isFinite(lat)
  );
}

/** Clamp value to [min, max]. */
export function clamp(value: number, min: number, max: number): number {
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
}

/** Linear interpolation. */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
