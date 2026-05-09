/**
 * Sequences a Mission against a FlightModel. Owns the MissionPhase FSM and
 * the leg-progress accounting that powers the HUD progress bar.
 */

import {type FlightModel, type FlightTarget} from './FlightModel';
import {SIM_DEFAULTS} from '../../core/constants/sim';
import {type GeoPoint, type GeoPosition} from '../../core/types/geo';
import {
  type Mission,
  MissionPhase,
  type MissionProgress,
  WaypointKind,
} from '../../core/types/mission';
import {distanceMetres} from '../../core/utils/geo';


export class MissionRunner {
  private phase: MissionPhase = MissionPhase.Idle;
  private currentIndex = 0;
  private legStartPoint: GeoPoint;
  private loiterRemainingMs = 0;

  constructor(
    private readonly mission: Mission,
    private readonly flight: FlightModel,
  ) {
    this.legStartPoint = {lat: mission.home.lat, lon: mission.home.lon};
  }

  start(): void {
    this.phase = MissionPhase.Arming;
    this.currentIndex = 0;
    const firstWaypoint = this.mission.waypoints[0];
    this.legStartPoint = firstWaypoint
      ? {lat: this.mission.home.lat, lon: this.mission.home.lon}
      : {lat: this.mission.home.lat, lon: this.mission.home.lon};
  }

  /** Reset the runner and the model to the home pose. */
  reset(): void {
    this.phase = MissionPhase.Idle;
    this.currentIndex = 0;
    this.loiterRemainingMs = 0;
    this.flight.setState({
      position: this.mission.home,
      headingDeg: 0,
    });
  }

  step(dt: number): void {
    if (this.phase === MissionPhase.Idle || this.phase === MissionPhase.Complete) {
      return;
    }

    if (this.phase === MissionPhase.Arming) {
      // Instant arm in sim; future: emit ARM event then wait one tick.
      this.phase = this.firstFlightPhase();
      return;
    }

    const wp = this.mission.waypoints[this.currentIndex];
    if (!wp) {
      this.phase = MissionPhase.Complete;
      return;
    }

    const target: FlightTarget = {
      point: {lat: wp.position.lat, lon: wp.position.lon},
      altRel: wp.position.altRel,
      cruiseSpeed: wp.cruiseSpeed ?? this.mission.defaultCruiseSpeed,
    };

    if (this.phase === MissionPhase.Loitering) {
      this.loiterRemainingMs -= dt * 1000;
      this.flight.step(dt, target, wp.acceptanceRadius);
      if (this.loiterRemainingMs <= 0) {
        this.advance();
      }
      return;
    }

    const reached = this.flight.step(dt, target, wp.acceptanceRadius);
    if (!reached) {
      return;
    }

    if (wp.loiterSeconds && wp.loiterSeconds > 0) {
      this.loiterRemainingMs = wp.loiterSeconds * 1000;
      this.phase = MissionPhase.Loitering;
      return;
    }

    this.advance();
  }

  progress(): MissionProgress {
    const total = this.mission.waypoints.length;
    const wp = this.mission.waypoints[this.currentIndex];
    if (!wp) {
      return {
        phase: this.phase,
        currentWaypointIndex: this.currentIndex,
        totalWaypoints: total,
        legProgress: 1,
      };
    }
    const start = this.legStartPoint;
    const here = this.flight.snapshot().position;
    const totalLeg = distanceMetres(start, wp.position);
    const remaining = distanceMetres(
      {lat: here.lat, lon: here.lon},
      wp.position,
    );
    const legProgress = totalLeg <= 0.01 ? 1 : Math.max(0, Math.min(1, 1 - remaining / totalLeg));
    return {
      phase: this.phase,
      currentWaypointIndex: this.currentIndex,
      totalWaypoints: total,
      legProgress,
    };
  }

  isComplete(): boolean {
    return this.phase === MissionPhase.Complete;
  }

  private advance(): void {
    const finished = this.mission.waypoints[this.currentIndex];
    if (finished) {
      this.legStartPoint = {
        lat: finished.position.lat,
        lon: finished.position.lon,
      };
    }
    this.currentIndex++;
    this.loiterRemainingMs = 0;
    if (this.currentIndex >= this.mission.waypoints.length) {
      this.phase = MissionPhase.Complete;
      return;
    }
    const next = this.mission.waypoints[this.currentIndex];
    if (!next) {
      this.phase = MissionPhase.Complete;
      return;
    }
    this.phase = phaseForKind(next.kind);
  }

  private firstFlightPhase(): MissionPhase {
    const first = this.mission.waypoints[0];
    return first ? phaseForKind(first.kind) : MissionPhase.Complete;
  }
}

function phaseForKind(kind: WaypointKind): MissionPhase {
  switch (kind) {
    case WaypointKind.Takeoff:
      return MissionPhase.Takeoff;
    case WaypointKind.Land:
      return MissionPhase.Landing;
    case WaypointKind.ReturnToLaunch:
      return MissionPhase.Returning;
    case WaypointKind.Loiter:
      return MissionPhase.Loitering;
    case WaypointKind.Waypoint:
    default:
      return MissionPhase.EnRoute;
  }
}

/**
 * Build a canned demo mission. Phase 1 ships exactly one of these. Future
 * phases will load Mission objects from persistent storage / backend.
 */
export function buildDemoMission(home: GeoPosition): Mission {
  // A small box around `home`, ~120 m on a side, with a takeoff, four
  // perimeter waypoints, and an RTL/Land at the end.
  const offsetMetres = 0.0011; // ~120 m at most latitudes
  return {
    id: 'demo.box',
    name: 'Perimeter Sweep',
    home,
    defaultCruiseSpeed: SIM_DEFAULTS.cruiseSpeed,
    waypoints: [
      {
        id: 'wp.takeoff',
        kind: WaypointKind.Takeoff,
        position: {
          lat: home.lat,
          lon: home.lon,
          altMsl: home.altMsl + SIM_DEFAULTS.cruiseAltMetres,
          altRel: SIM_DEFAULTS.cruiseAltMetres,
        },
        acceptanceRadius: 4,
      },
      {
        id: 'wp.ne',
        kind: WaypointKind.Waypoint,
        position: {
          lat: home.lat + offsetMetres,
          lon: home.lon + offsetMetres,
          altMsl: home.altMsl + SIM_DEFAULTS.cruiseAltMetres,
          altRel: SIM_DEFAULTS.cruiseAltMetres,
        },
        acceptanceRadius: SIM_DEFAULTS.defaultAcceptanceRadiusMetres,
      },
      {
        id: 'wp.se',
        kind: WaypointKind.Waypoint,
        position: {
          lat: home.lat - offsetMetres,
          lon: home.lon + offsetMetres,
          altMsl: home.altMsl + SIM_DEFAULTS.cruiseAltMetres,
          altRel: SIM_DEFAULTS.cruiseAltMetres,
        },
        acceptanceRadius: SIM_DEFAULTS.defaultAcceptanceRadiusMetres,
      },
      {
        id: 'wp.sw',
        kind: WaypointKind.Loiter,
        position: {
          lat: home.lat - offsetMetres,
          lon: home.lon - offsetMetres,
          altMsl: home.altMsl + SIM_DEFAULTS.cruiseAltMetres,
          altRel: SIM_DEFAULTS.cruiseAltMetres,
        },
        acceptanceRadius: SIM_DEFAULTS.defaultAcceptanceRadiusMetres,
        loiterSeconds: 5,
      },
      {
        id: 'wp.nw',
        kind: WaypointKind.Waypoint,
        position: {
          lat: home.lat + offsetMetres,
          lon: home.lon - offsetMetres,
          altMsl: home.altMsl + SIM_DEFAULTS.cruiseAltMetres,
          altRel: SIM_DEFAULTS.cruiseAltMetres,
        },
        acceptanceRadius: SIM_DEFAULTS.defaultAcceptanceRadiusMetres,
      },
      {
        id: 'wp.land',
        kind: WaypointKind.Land,
        position: {
          lat: home.lat,
          lon: home.lon,
          altMsl: home.altMsl,
          altRel: 0,
        },
        acceptanceRadius: 4,
      },
    ],
  };
}

export function buildCorridorMission(home: GeoPosition): Mission {
  const offsetLat = 0.0016;
  const offsetLon = 0.0004;
  return {
    id: 'demo.corridor',
    name: 'Corridor Inspection',
    home,
    defaultCruiseSpeed: SIM_DEFAULTS.cruiseSpeed - 2,
    waypoints: [
      {
        id: 'takeoff',
        kind: WaypointKind.Takeoff,
        position: {
          lat: home.lat,
          lon: home.lon,
          altMsl: home.altMsl + SIM_DEFAULTS.cruiseAltMetres,
          altRel: SIM_DEFAULTS.cruiseAltMetres,
        },
        acceptanceRadius: 4,
      },
      {
        id: 'c1',
        kind: WaypointKind.Waypoint,
        position: {
          lat: home.lat + offsetLat,
          lon: home.lon - offsetLon,
          altMsl: home.altMsl + SIM_DEFAULTS.cruiseAltMetres,
          altRel: SIM_DEFAULTS.cruiseAltMetres,
        },
        acceptanceRadius: SIM_DEFAULTS.defaultAcceptanceRadiusMetres,
      },
      {
        id: 'c2',
        kind: WaypointKind.Waypoint,
        position: {
          lat: home.lat + offsetLat * 1.8,
          lon: home.lon + offsetLon,
          altMsl: home.altMsl + SIM_DEFAULTS.cruiseAltMetres,
          altRel: SIM_DEFAULTS.cruiseAltMetres,
        },
        acceptanceRadius: SIM_DEFAULTS.defaultAcceptanceRadiusMetres,
      },
      {
        id: 'c3',
        kind: WaypointKind.Loiter,
        position: {
          lat: home.lat + offsetLat * 2.2,
          lon: home.lon,
          altMsl: home.altMsl + SIM_DEFAULTS.cruiseAltMetres,
          altRel: SIM_DEFAULTS.cruiseAltMetres,
        },
        acceptanceRadius: SIM_DEFAULTS.defaultAcceptanceRadiusMetres,
        loiterSeconds: 4,
      },
      {
        id: 'land',
        kind: WaypointKind.Land,
        position: {
          lat: home.lat,
          lon: home.lon,
          altMsl: home.altMsl,
          altRel: 0,
        },
        acceptanceRadius: 4,
      },
    ],
  };
}

export function buildOrbitMission(home: GeoPosition): Mission {
  const r = 0.0009;
  return {
    id: 'demo.orbit',
    name: 'Target Orbit',
    home,
    defaultCruiseSpeed: SIM_DEFAULTS.cruiseSpeed - 1,
    waypoints: [
      {
        id: 'takeoff',
        kind: WaypointKind.Takeoff,
        position: {
          lat: home.lat,
          lon: home.lon,
          altMsl: home.altMsl + SIM_DEFAULTS.cruiseAltMetres,
          altRel: SIM_DEFAULTS.cruiseAltMetres,
        },
        acceptanceRadius: 4,
      },
      {
        id: 'o1',
        kind: WaypointKind.Waypoint,
        position: {
          lat: home.lat + r,
          lon: home.lon,
          altMsl: home.altMsl + SIM_DEFAULTS.cruiseAltMetres,
          altRel: SIM_DEFAULTS.cruiseAltMetres,
        },
        acceptanceRadius: SIM_DEFAULTS.defaultAcceptanceRadiusMetres,
      },
      {
        id: 'o2',
        kind: WaypointKind.Waypoint,
        position: {
          lat: home.lat,
          lon: home.lon + r,
          altMsl: home.altMsl + SIM_DEFAULTS.cruiseAltMetres,
          altRel: SIM_DEFAULTS.cruiseAltMetres,
        },
        acceptanceRadius: SIM_DEFAULTS.defaultAcceptanceRadiusMetres,
      },
      {
        id: 'o3',
        kind: WaypointKind.Waypoint,
        position: {
          lat: home.lat - r,
          lon: home.lon,
          altMsl: home.altMsl + SIM_DEFAULTS.cruiseAltMetres,
          altRel: SIM_DEFAULTS.cruiseAltMetres,
        },
        acceptanceRadius: SIM_DEFAULTS.defaultAcceptanceRadiusMetres,
      },
      {
        id: 'o4',
        kind: WaypointKind.Loiter,
        position: {
          lat: home.lat,
          lon: home.lon - r,
          altMsl: home.altMsl + SIM_DEFAULTS.cruiseAltMetres,
          altRel: SIM_DEFAULTS.cruiseAltMetres,
        },
        acceptanceRadius: SIM_DEFAULTS.defaultAcceptanceRadiusMetres,
        loiterSeconds: 8,
      },
      {
        id: 'land',
        kind: WaypointKind.Land,
        position: {
          lat: home.lat,
          lon: home.lon,
          altMsl: home.altMsl,
          altRel: 0,
        },
        acceptanceRadius: 4,
      },
    ],
  };
}

export function buildSampleMissions(home: GeoPosition): Mission[] {
  return [
    buildDemoMission(home),
    buildCorridorMission(home),
    buildOrbitMission(home),
  ];
}
