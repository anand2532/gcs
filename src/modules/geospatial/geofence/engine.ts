import {
  GeofenceZoneKind,
  type AltitudeCylinderZone,
  type CircleZone,
  type GeofenceViolation,
  type GeofenceZone,
  type PolygonZone,
} from './types';
import {type GeoPoint} from '../../../core/types/geo';
import {distanceMetres} from '../../../core/utils/geo';
import {pointInPolygon} from '../../mission-planning/geometry';

function altitudeMsl(p: GeoPoint): number {
  const ext = p as GeoPoint & {altMsl?: number; altRel?: number};
  if (typeof ext.altMsl === 'number') {
    return ext.altMsl;
  }
  if (typeof ext.altRel === 'number') {
    return ext.altRel;
  }
  return 0;
}

export class GeofenceEngine {
  private zones: readonly GeofenceZone[] = [];

  setZones(zones: readonly GeofenceZone[]): void {
    this.zones = zones;
  }

  getZones(): readonly GeofenceZone[] {
    return this.zones;
  }

  evaluatePoint(p: GeoPoint): GeofenceViolation | null {
    const alt = altitudeMsl(p);
    for (const z of this.zones) {
      const inside = this.containsHorizontal(z, p);
      if (!inside) {
        continue;
      }
      if (!this.altitudeAllows(z, alt)) {
        return {
          zoneId: z.id,
          zoneLabel: z.label,
          message: `Altitude outside zone limits (${z.label}).`,
        };
      }
    }
    return null;
  }

  /** Returns violations when any waypoint lies outside allowed composite hull (MVP: per-zone keep-in). */
  evaluateMissionCorridor(points: readonly GeoPoint[]): GeofenceViolation[] {
    const out: GeofenceViolation[] = [];
    for (const p of points) {
      const v = this.evaluatePoint(p);
      if (v) {
        out.push(v);
      }
    }
    return out;
  }

  private containsHorizontal(z: GeofenceZone, p: GeoPoint): boolean {
    switch (z.kind) {
      case GeofenceZoneKind.Polygon:
        return pointInPolygon(p, (z as PolygonZone).ring);
      case GeofenceZoneKind.Circle: {
        const c = z as CircleZone;
        return distanceMetres(c.center, p) <= c.radiusM;
      }
      case GeofenceZoneKind.AltitudeCylinder: {
        const c = z as AltitudeCylinderZone;
        return distanceMetres(c.center, p) <= c.radiusM;
      }
      default:
        return false;
    }
  }

  private altitudeAllows(z: GeofenceZone, altMsl: number): boolean {
    const floor = 'floorAltM' in z ? z.floorAltM : undefined;
    const ceil = 'ceilingAltM' in z ? z.ceilingAltM : undefined;
    if (floor !== undefined && altMsl < floor) {
      return false;
    }
    if (ceil !== undefined && altMsl > ceil) {
      return false;
    }
    return true;
  }
}

export const geofenceEngine = new GeofenceEngine();
