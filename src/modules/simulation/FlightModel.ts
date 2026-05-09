/**
 * Lightweight kinematic flight model.
 *
 * Not an aerodynamic sim — just enough physics to make the marker move in a
 * way a pilot recognises: bounded speed, bounded yaw rate, bounded climb.
 * The model owns the *physical* state; the MissionRunner steers it.
 */

import {SIM_DEFAULTS} from '../../core/constants/sim';
import {type GeoPoint, type GeoPosition, type VelocityEnu} from '../../core/types/geo';
import {
  angleDeltaDeg,
  bearingDeg,
  clamp,
  destinationPoint,
  distanceMetres,
  toRadians,
} from '../../core/utils/geo';

export interface FlightStateSnapshot {
  readonly position: GeoPosition;
  readonly velocity: VelocityEnu;
  readonly headingDeg: number;
  readonly groundSpeed: number;
  readonly climbSpeed: number;
}

export interface FlightTarget {
  readonly point: GeoPoint;
  /** Target altitude above home, metres. */
  readonly altRel: number;
  /** Desired horizontal speed, m/s. */
  readonly cruiseSpeed: number;
}

export class FlightModel {
  private lat: number;
  private lon: number;
  private altRel: number;
  private heading: number; // deg
  private speed: number; // m/s, horizontal
  private climb: number; // m/s, positive up
  private readonly homeAltMsl: number;

  constructor(home: GeoPosition, initialHeadingDeg = 0) {
    this.lat = home.lat;
    this.lon = home.lon;
    this.altRel = home.altRel;
    this.heading = initialHeadingDeg;
    this.speed = 0;
    this.climb = 0;
    this.homeAltMsl = home.altMsl;
  }

  snapshot(): FlightStateSnapshot {
    const headingRad = toRadians(this.heading);
    const vNorth = Math.cos(headingRad) * this.speed;
    const vEast = Math.sin(headingRad) * this.speed;
    return {
      position: {
        lat: this.lat,
        lon: this.lon,
        altMsl: this.homeAltMsl + this.altRel,
        altRel: this.altRel,
      },
      velocity: {vEast, vNorth, vUp: this.climb},
      headingDeg: this.heading,
      groundSpeed: this.speed,
      climbSpeed: this.climb,
    };
  }

  /**
   * Step one tick of `dt` seconds toward the given target. Returns true if
   * we reached the horizontal target inside `acceptanceRadius`.
   */
  step(dt: number, target: FlightTarget, acceptanceRadius: number): boolean {
    const horizontalDistance = distanceMetres(
      {lat: this.lat, lon: this.lon},
      target.point,
    );

    // Horizontal: turn toward target, accelerate to cruise, decelerate at end.
    const targetBearing = bearingDeg(
      {lat: this.lat, lon: this.lon},
      target.point,
    );
    const headingDelta = angleDeltaDeg(this.heading, targetBearing);
    const maxYawStep = SIM_DEFAULTS.yawRateDegPerSec * dt;
    const yawStep = clamp(headingDelta, -maxYawStep, maxYawStep);
    this.heading = (this.heading + yawStep + 360) % 360;

    const desiredSpeed =
      horizontalDistance < acceptanceRadius * 2
        ? Math.max(0, target.cruiseSpeed * (horizontalDistance / (acceptanceRadius * 2)))
        : target.cruiseSpeed;

    const accel = 4; // m/s^2 — gentle
    const speedDelta = clamp(desiredSpeed - this.speed, -accel * dt, accel * dt);
    this.speed = Math.max(0, this.speed + speedDelta);

    if (this.speed > 0) {
      const stepMetres = this.speed * dt;
      const next = destinationPoint(
        {lat: this.lat, lon: this.lon},
        Math.min(stepMetres, horizontalDistance),
        this.heading,
      );
      this.lat = next.lat;
      this.lon = next.lon;
    }

    // Vertical: drive altRel toward target.altRel with bounded climb rate.
    const altDelta = target.altRel - this.altRel;
    const maxClimb =
      altDelta >= 0 ? SIM_DEFAULTS.climbRate : -SIM_DEFAULTS.descentRate;
    const desiredClimb =
      Math.abs(altDelta) < 0.5 ? 0 : Math.sign(altDelta) * Math.abs(maxClimb);
    const climbAccel = 2;
    const climbStep = clamp(desiredClimb - this.climb, -climbAccel * dt, climbAccel * dt);
    this.climb += climbStep;
    this.altRel += this.climb * dt;

    return (
      horizontalDistance <= acceptanceRadius &&
      Math.abs(altDelta) <= 1.0
    );
  }

  /** Force-set the state. Used by reset() and for waypoint snapping. */
  setState(snapshot: {
    position: GeoPosition;
    headingDeg: number;
    groundSpeed?: number;
    climbSpeed?: number;
  }): void {
    this.lat = snapshot.position.lat;
    this.lon = snapshot.position.lon;
    this.altRel = snapshot.position.altRel;
    this.heading = snapshot.headingDeg;
    this.speed = snapshot.groundSpeed ?? 0;
    this.climb = snapshot.climbSpeed ?? 0;
  }
}
