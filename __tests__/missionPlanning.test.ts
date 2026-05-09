import {describe, expect, it} from '@jest/globals';

import {type GeoPoint} from '../src/core/types/geo';
import {
  addPoint,
  areaSqM,
  generateSurveyPath,
  hasSelfIntersection,
  initialPolygonEditorState,
  insertPointAtNearestSegment,
  missionSimulationAdapter,
  validateDraft,
} from '../src/modules/mission-planning';

const SQUARE: GeoPoint[] = [
  {lat: 28.6129, lon: 77.2295},
  {lat: 28.6136, lon: 77.2295},
  {lat: 28.6136, lon: 77.2302},
  {lat: 28.6129, lon: 77.2302},
];

describe('mission planning engines', () => {
  it('computes non-zero area for a valid polygon', () => {
    expect(areaSqM(SQUARE)).toBeGreaterThan(1000);
  });

  it('detects self intersection', () => {
    const bad: GeoPoint[] = [
      {lat: 0, lon: 0},
      {lat: 1, lon: 1},
      {lat: 0, lon: 1},
      {lat: 1, lon: 0},
    ];
    expect(hasSelfIntersection(bad)).toBe(true);
  });

  it('supports add + long-press insert operation', () => {
    let state = initialPolygonEditorState();
    SQUARE.slice(0, 3).forEach(p => {
      state = addPoint(state, p);
    });
    expect(state.points).toHaveLength(3);
    state = insertPointAtNearestSegment(state, SQUARE[3]!);
    expect(state.points).toHaveLength(4);
  });

  it('generates survey path and validation estimates', () => {
    const path = generateSurveyPath(SQUARE, {
      altitudeM: 60,
      spacingM: 18,
      overlapPct: 70,
      speedMps: 10,
    });
    expect(path.length).toBeGreaterThan(2);
    const validation = validateDraft(
      SQUARE,
      path,
      {altitudeM: 60, spacingM: 18, overlapPct: 70, speedMps: 10},
    );
    expect(validation.estimatedDurationSec).toBeGreaterThan(0);
  });

  it('adapts generated draft to simulation mission', () => {
    const path = generateSurveyPath(SQUARE, {
      altitudeM: 55,
      spacingM: 20,
      overlapPct: 70,
      speedMps: 10,
    });
    const draft = {
      id: 'draft.test',
      name: 'Draft Test',
      mode: 'POLYGON_SURVEY' as const,
      polygon: SQUARE,
      survey: {altitudeM: 55, spacingM: 20, overlapPct: 70, speedMps: 10},
      generatedPath: path,
      validation: {
        valid: true,
        issues: [],
        estimatedDurationSec: 100,
        estimatedBatteryUsePct: 20,
      },
      updatedAt: Date.now(),
    };
    const mission = missionSimulationAdapter.toMission(draft);
    expect(mission.waypoints.length).toBeGreaterThan(path.length);
    expect(mission.name).toBe('Draft Test');
  });
});

