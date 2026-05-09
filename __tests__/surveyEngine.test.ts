import {
  SURVEY_MAX_GRID_CELLS,
  SURVEY_MAX_PATH_POINTS,
} from '../src/core/constants/missionPlanning';
import {type GeoPoint} from '../src/core/types/geo';
import {type SurveyConfig} from '../src/core/types/missionPlanning';
import {
  estimateSurveyGridCells,
  generateSurveyPath,
} from '../src/modules/mission-planning/survey-engine';
import {validateDraft} from '../src/modules/mission-planning/validation';

function square(center: GeoPoint, delta: number): GeoPoint[] {
  return [
    {lat: center.lat - delta, lon: center.lon - delta},
    {lat: center.lat + delta, lon: center.lon - delta},
    {lat: center.lat + delta, lon: center.lon + delta},
    {lat: center.lat - delta, lon: center.lon + delta},
  ];
}

describe('survey-engine stability', () => {
  const survey: SurveyConfig = {
    altitudeM: 50,
    spacingM: 25,
    overlapPct: 70,
    speedMps: 10,
  };

  it('returns empty path when grid estimate exceeds cap', () => {
    const huge = square({lat: 0, lon: 0}, 2);
    const tight: SurveyConfig = {...survey, spacingM: 1};
    expect(estimateSurveyGridCells(huge, tight)).toBeGreaterThan(
      SURVEY_MAX_GRID_CELLS,
    );
    expect(generateSurveyPath(huge, tight)).toEqual([]);
  });

  it('validateDraft flags SURVEY_GRID_TOO_COMPLEX before geometry work', () => {
    const huge = square({lat: 28.6, lon: 77.2}, 1);
    const tight: SurveyConfig = {...survey, spacingM: 2};
    const path = generateSurveyPath(huge, tight);
    const result = validateDraft(huge, path, tight);
    expect(
      result.issues.some(i => i.code === 'SURVEY_GRID_TOO_COMPLEX'),
    ).toBe(true);
    expect(result.valid).toBe(false);
  });

  it('caps emitted waypoints at SURVEY_MAX_PATH_POINTS', () => {
    const poly = square({lat: 28.6129, lon: 77.2295}, 0.004);
    const fine: SurveyConfig = {...survey, spacingM: 6};
    expect(estimateSurveyGridCells(poly, fine)).toBeLessThanOrEqual(
      SURVEY_MAX_GRID_CELLS,
    );
    const path = generateSurveyPath(poly, fine);
    expect(path.length).toBeLessThanOrEqual(SURVEY_MAX_PATH_POINTS);
    const v = validateDraft(poly, path, fine);
    if (path.length >= SURVEY_MAX_PATH_POINTS) {
      expect(v.issues.some(i => i.code === 'SURVEY_PATH_TOO_LONG')).toBe(true);
    }
  });
});
