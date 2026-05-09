import {
  SURVEY_MAX_GRID_CELLS,
  SURVEY_MAX_PATH_POINTS,
} from '../../../core/constants/missionPlanning';
import {type GeoPoint} from '../../../core/types/geo';
import {
  type MissionValidationIssue,
  type MissionValidationResult,
  type PathPoint,
  type SurveyConfig,
} from '../../../core/types/missionPlanning';
import {areaSqM, hasSelfIntersection} from '../geometry';
import {estimateSurveyGridCells} from '../survey-engine';

const MIN_SAFE_AREA_SQ_M = 900;

export function validateDraft(
  polygon: readonly GeoPoint[],
  path: readonly PathPoint[],
  survey: SurveyConfig,
): MissionValidationResult {
  const issues: MissionValidationIssue[] = [];
  const area = areaSqM(polygon);
  const gridEstimate =
    polygon.length >= 3 ? estimateSurveyGridCells(polygon, survey) : 0;
  if (polygon.length >= 3 && gridEstimate > SURVEY_MAX_GRID_CELLS) {
    issues.push({
      code: 'SURVEY_GRID_TOO_COMPLEX',
      severity: 'error',
      message:
        'Survey grid too dense for this area — increase line spacing or shrink the polygon.',
    });
  }
  if (path.length >= SURVEY_MAX_PATH_POINTS) {
    issues.push({
      code: 'SURVEY_PATH_TOO_LONG',
      severity: 'error',
      message: 'Generated survey path hit the maximum waypoint limit.',
    });
  }
  if (polygon.length >= 3 && hasSelfIntersection(polygon)) {
    issues.push({
      code: 'POLYGON_SELF_INTERSECTION',
      severity: 'error',
      message: 'Operational area polygon has self intersections.',
    });
  }
  if (polygon.length >= 3 && area < MIN_SAFE_AREA_SQ_M) {
    issues.push({
      code: 'POLYGON_TOO_SMALL',
      severity: 'error',
      message: 'Operational area is below minimum safe threshold.',
    });
  }
  const estimatedDurationSec = Math.round((path.length * Math.max(2, survey.spacingM / 8)) / survey.speedMps);
  const estimatedBatteryUsePct = Math.min(95, Math.round(estimatedDurationSec / 60));
  if (estimatedBatteryUsePct > 75) {
    issues.push({
      code: 'BATTERY_ESTIMATE_RISK',
      severity: 'warning',
      message: 'Estimated battery usage is high for a single sortie.',
    });
  }
  return {
    valid: !issues.some(i => i.severity === 'error'),
    issues,
    estimatedDurationSec,
    estimatedBatteryUsePct,
  };
}

