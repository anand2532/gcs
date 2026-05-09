/**
 * Core geographic primitives.
 *
 * These types are intentionally narrow and serializable so they can travel
 * unchanged across the bridge (native -> JS), the wire (MQTT/HTTP), and
 * persistence layers without coercion.
 */

/** A latitude/longitude point, WGS84, in decimal degrees. */
export interface GeoPoint {
  readonly lat: number;
  readonly lon: number;
}

/** A 3D geographic position. Altitudes are metres. */
export interface GeoPosition extends GeoPoint {
  /** Altitude above mean sea level (metres). */
  readonly altMsl: number;
  /** Altitude relative to home / takeoff point (metres). */
  readonly altRel: number;
}

/** Velocity vector in the local ENU (East-North-Up) frame, m/s. */
export interface VelocityEnu {
  readonly vEast: number;
  readonly vNorth: number;
  readonly vUp: number;
}

/** Heading in degrees [0, 360). 0 = north, 90 = east. */
export type HeadingDeg = number;

/** Map camera state (kept lightweight so it serializes cleanly). */
export interface MapCameraState {
  readonly center: GeoPoint;
  readonly zoom: number;
  readonly bearing: number;
  readonly pitch: number;
}
