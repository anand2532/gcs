/**
 * Mission domain types.
 *
 * Phase 1 only consumes a hard-coded demo mission inside the simulation
 * engine, but the types live here so Phase 3 (mission planner) can extend
 * without a rename pass.
 */

import {type GeoPosition} from './geo';

export const WaypointKind = {
  Takeoff: 'TAKEOFF',
  Waypoint: 'WAYPOINT',
  Loiter: 'LOITER',
  Land: 'LAND',
  ReturnToLaunch: 'RTL',
} as const;
export type WaypointKind = (typeof WaypointKind)[keyof typeof WaypointKind];

export interface Waypoint {
  readonly id: string;
  readonly kind: WaypointKind;
  readonly position: GeoPosition;
  /**
   * Acceptance radius in metres — once the vehicle is within this distance
   * the waypoint is considered reached.
   */
  readonly acceptanceRadius: number;
  /** Optional cruise speed override, m/s. */
  readonly cruiseSpeed?: number;
  /** Optional loiter time at this waypoint, seconds. */
  readonly loiterSeconds?: number;
}

export interface Mission {
  readonly id: string;
  readonly name: string;
  readonly home: GeoPosition;
  readonly waypoints: readonly Waypoint[];
  readonly defaultCruiseSpeed: number;
}

export const MissionPhase = {
  Idle: 'IDLE',
  Arming: 'ARMING',
  Takeoff: 'TAKEOFF',
  EnRoute: 'EN_ROUTE',
  Loitering: 'LOITERING',
  Returning: 'RETURNING',
  Landing: 'LANDING',
  Complete: 'COMPLETE',
} as const;
export type MissionPhase = (typeof MissionPhase)[keyof typeof MissionPhase];

export interface MissionProgress {
  readonly phase: MissionPhase;
  readonly currentWaypointIndex: number;
  readonly totalWaypoints: number;
  /** Fraction [0..1] of the active leg completed. */
  readonly legProgress: number;
}
