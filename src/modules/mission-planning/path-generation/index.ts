import {type GeoPoint} from '../../../core/types/geo';
import {type PathPoint} from '../../../core/types/missionPlanning';

export interface RoutePreview {
  readonly line: readonly GeoPoint[];
  readonly arrows: readonly GeoPoint[];
}

export function buildRoutePreview(path: readonly PathPoint[]): RoutePreview {
  const line = path.map(p => ({lat: p.lat, lon: p.lon}));
  const arrows: GeoPoint[] = [];
  for (let i = 1; i < path.length; i += 4) {
    arrows.push({lat: path[i]!.lat, lon: path[i]!.lon});
  }
  return {line, arrows};
}

