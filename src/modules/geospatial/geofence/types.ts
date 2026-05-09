import {type GeoPoint} from '../../../core/types/geo';

export const GeofenceZoneKind = {
  Polygon: 'POLYGON',
  Circle: 'CIRCLE',
  AltitudeCylinder: 'ALTITUDE_CYLINDER',
} as const;
export type GeofenceZoneKind =
  (typeof GeofenceZoneKind)[keyof typeof GeofenceZoneKind];

export interface PolygonZone {
  readonly kind: typeof GeofenceZoneKind.Polygon;
  readonly id: string;
  readonly label: string;
  /** Closed ring in map order [lon,lat]. */
  readonly ring: readonly GeoPoint[];
  readonly floorAltM?: number;
  readonly ceilingAltM?: number;
}

export interface CircleZone {
  readonly kind: typeof GeofenceZoneKind.Circle;
  readonly id: string;
  readonly label: string;
  readonly center: GeoPoint;
  readonly radiusM: number;
  readonly floorAltM?: number;
  readonly ceilingAltM?: number;
}

export interface AltitudeCylinderZone {
  readonly kind: typeof GeofenceZoneKind.AltitudeCylinder;
  readonly id: string;
  readonly label: string;
  readonly center: GeoPoint;
  readonly radiusM: number;
  readonly floorAltM: number;
  readonly ceilingAltM: number;
}

export type GeofenceZone = PolygonZone | CircleZone | AltitudeCylinderZone;

export interface GeofenceViolation {
  readonly zoneId: string;
  readonly zoneLabel: string;
  readonly message: string;
}
