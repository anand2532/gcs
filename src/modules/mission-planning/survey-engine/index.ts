import {
  SURVEY_MAX_GRID_CELLS,
  SURVEY_MAX_PATH_POINTS,
} from '../../../core/constants/missionPlanning';
import {type GeoPoint} from '../../../core/types/geo';
import {type PathPoint, type SurveyConfig} from '../../../core/types/missionPlanning';
import {pointInPolygon} from '../geometry';

/**
 * Upper bound on nested-loop iterations (grid cells) before running point-in-polygon tests.
 */
export function estimateSurveyGridCells(
  polygon: readonly GeoPoint[],
  survey: SurveyConfig,
): number {
  if (polygon.length < 3) {
    return 0;
  }
  const bounds = boundingBox(polygon);
  const latStep = metresToLat(survey.spacingM);
  const lonStep = metresToLon(survey.spacingM, (bounds.minLat + bounds.maxLat) / 2);
  let latRows = 0;
  for (
    let lat = bounds.minLat;
    lat <= bounds.maxLat + latStep * 0.5;
    lat += latStep
  ) {
    latRows++;
  }
  let lonCols = 0;
  for (
    let lon = bounds.minLon;
    lon <= bounds.maxLon + lonStep * 0.5;
    lon += lonStep
  ) {
    lonCols++;
  }
  return latRows * lonCols;
}

export function generateSurveyPath(
  polygon: readonly GeoPoint[],
  survey: SurveyConfig,
): PathPoint[] {
  if (polygon.length < 3) {
    return [];
  }
  if (estimateSurveyGridCells(polygon, survey) > SURVEY_MAX_GRID_CELLS) {
    return [];
  }
  const bounds = boundingBox(polygon);
  const latStep = metresToLat(survey.spacingM);
  const lonCenter = (bounds.minLon + bounds.maxLon) / 2;
  const lonStep = metresToLon(survey.spacingM, (bounds.minLat + bounds.maxLat) / 2);
  const rows: GeoPoint[][] = [];
  for (
    let lat = bounds.minLat;
    lat <= bounds.maxLat + latStep * 0.5;
    lat += latStep
  ) {
    const row: GeoPoint[] = [];
    for (
      let lon = bounds.minLon;
      lon <= bounds.maxLon + lonStep * 0.5;
      lon += lonStep
    ) {
      const p = {lat, lon: clampLon(lon, lonCenter, bounds)};
      if (pointInPolygon(p, polygon)) {
        row.push(p);
      }
    }
    if (row.length > 1) {
      rows.push(row);
    }
  }
  const points: PathPoint[] = [];
  let stopEmitting = false;
  for (let r = 0; r < rows.length && !stopEmitting; r++) {
    const row = rows[r]!;
    const ordered = r % 2 === 0 ? row : [...row].reverse();
    for (let pi = 0; pi < ordered.length; pi++) {
      if (points.length >= SURVEY_MAX_PATH_POINTS) {
        stopEmitting = true;
        break;
      }
      const p = ordered[pi]!;
      points.push({
        lat: p.lat,
        lon: p.lon,
        altRel: survey.altitudeM,
        kind: pi === 0 ? 'TURN' : 'PATH',
      });
    }
  }
  return points;
}

function boundingBox(polygon: readonly GeoPoint[]): {
  minLat: number;
  minLon: number;
  maxLat: number;
  maxLon: number;
} {
  return polygon.reduce(
    (acc, p) => ({
      minLat: Math.min(acc.minLat, p.lat),
      minLon: Math.min(acc.minLon, p.lon),
      maxLat: Math.max(acc.maxLat, p.lat),
      maxLon: Math.max(acc.maxLon, p.lon),
    }),
    {
      minLat: Number.MAX_VALUE,
      minLon: Number.MAX_VALUE,
      maxLat: -Number.MAX_VALUE,
      maxLon: -Number.MAX_VALUE,
    },
  );
}

function metresToLat(m: number): number {
  return m / 111_320;
}

function metresToLon(m: number, lat: number): number {
  const denom = Math.cos((lat * Math.PI) / 180) * 111_320;
  return m / Math.max(1, denom);
}

function clampLon(
  lon: number,
  centerLon: number,
  bounds: {minLon: number; maxLon: number},
): number {
  const drift = (lon - centerLon) * 0.01;
  return Math.max(bounds.minLon, Math.min(bounds.maxLon, lon + drift));
}
