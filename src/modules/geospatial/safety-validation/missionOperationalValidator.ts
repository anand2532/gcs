/**
 * Orchestrates geometry validation + operational geofence + airspace checks.
 */

import {type GeoPoint} from '../../../core/types/geo';
import {
  type MissionValidationIssue,
  type MissionValidationResult,
  type PathPoint,
  type SurveyConfig,
} from '../../../core/types/missionPlanning';
import {validateDraft} from '../../mission-planning/validation';
import {
  pointInRestrictedAirspace,
  polygonCentroid,
} from '../airspace/airspaceChecks';
import {AirspaceStore} from '../airspace/AirspaceStore';
import {geofenceEngine} from '../geofence/engine';

function mergeIssues(
  base: MissionValidationResult,
  extra: readonly MissionValidationIssue[],
): MissionValidationResult {
  const issues = [...base.issues, ...extra];
  const blocked = issues.some(i => i.severity === 'error');
  return {
    ...base,
    issues,
    valid: !blocked,
  };
}

/**
 * Full mission draft validation: survey geometry + airspace + geofence corridor.
 * Synchronous for use inside `useMemo` in the planner hook.
 */
export function validateMissionOperational(
  polygon: readonly GeoPoint[],
  path: readonly PathPoint[],
  survey: SurveyConfig,
): MissionValidationResult {
  let result = validateDraft(polygon, path, survey);
  const extra: MissionValidationIssue[] = [];

  const fc = AirspaceStore.getActiveGeoJson();
  if (polygon.length >= 3) {
    const c = polygonCentroid(polygon);
    const air = pointInRestrictedAirspace(c, fc);
    if (air.blocked) {
      extra.push({
        code: 'AIRSPACE_RESTRICTED',
        severity: 'error',
        message: `Operational area centroid lies inside restricted airspace (${air.label ?? 'restricted'}).`,
      });
    }
  }

  for (const wp of path) {
    const airPt = pointInRestrictedAirspace(wp, fc);
    if (airPt.blocked) {
      extra.push({
        code: 'NO_FLY_INTERSECTION',
        severity: 'error',
        message: `Survey path intersects restricted airspace (${airPt.label ?? 'restricted'}).`,
      });
      break;
    }
  }

  const gfViolations = geofenceEngine.evaluateMissionCorridor(path);
  for (const v of gfViolations) {
    extra.push({
      code: 'GEOFENCE_VIOLATION',
      severity: 'error',
      message: v.message,
    });
  }

  if (survey.altitudeM > 400) {
    extra.push({
      code: 'TERRAIN_CAUTION',
      severity: 'warning',
      message: 'High survey altitude — confirm terrain clearance and local regulations.',
    });
  }

  result = mergeIssues(result, extra);
  return result;
}
