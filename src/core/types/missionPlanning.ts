import {type GeoPoint} from './geo';
import {type Mission} from './mission';

export const PlanningMode = {
  PolygonSurvey: 'POLYGON_SURVEY',
  Waypoint: 'WAYPOINT',
  Corridor: 'CORRIDOR',
  Perimeter: 'PERIMETER',
  FreeDraw: 'FREE_DRAW',
} as const;
export type PlanningMode = (typeof PlanningMode)[keyof typeof PlanningMode];

export interface SurveyConfig {
  readonly altitudeM: number;
  readonly spacingM: number;
  readonly overlapPct: number;
  readonly speedMps: number;
}

export interface PathPoint extends GeoPoint {
  readonly altRel: number;
  readonly kind: 'TAKEOFF' | 'PATH' | 'TURN' | 'LAND';
}

export interface MissionValidationIssue {
  readonly code:
    | 'POLYGON_TOO_SMALL'
    | 'POLYGON_SELF_INTERSECTION'
    | 'GEOFENCE_CONFLICT'
    | 'POLICY_BLOCK'
    | 'BATTERY_ESTIMATE_RISK'
    | 'SURVEY_GRID_TOO_COMPLEX'
    | 'SURVEY_PATH_TOO_LONG';
  readonly severity: 'warning' | 'error';
  readonly message: string;
}

export interface MissionValidationResult {
  readonly valid: boolean;
  readonly issues: readonly MissionValidationIssue[];
  readonly estimatedDurationSec: number;
  readonly estimatedBatteryUsePct: number;
}

export interface PlannedMissionDraft {
  readonly id: string;
  readonly name: string;
  readonly mode: PlanningMode;
  readonly polygon: readonly GeoPoint[];
  readonly takeoff?: GeoPoint;
  readonly landing?: GeoPoint;
  readonly survey: SurveyConfig;
  readonly generatedPath: readonly PathPoint[];
  readonly validation: MissionValidationResult;
  readonly updatedAt: number;
  readonly orgZoneId?: string;
}

export interface MissionSimulationAdapter {
  toMission(draft: PlannedMissionDraft): Mission;
}

