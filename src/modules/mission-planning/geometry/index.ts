import {type GeoPoint} from '../../../core/types/geo';

const M_PER_DEG_LAT = 111_320;

export function areaSqM(points: readonly GeoPoint[]): number {
  if (points.length < 3) {
    return 0;
  }
  const local = points.map(toLocalXY);
  let sum = 0;
  for (let i = 0; i < local.length; i++) {
    const a = local[i]!;
    const b = local[(i + 1) % local.length]!;
    sum += a.x * b.y - b.x * a.y;
  }
  return Math.abs(sum) * 0.5;
}

export function hasSelfIntersection(points: readonly GeoPoint[]): boolean {
  if (points.length < 4) {
    return false;
  }
  for (let i = 0; i < points.length; i++) {
    const a1 = points[i]!;
    const a2 = points[(i + 1) % points.length]!;
    for (let j = i + 1; j < points.length; j++) {
      if (Math.abs(i - j) <= 1) {
        continue;
      }
      if (i === 0 && j === points.length - 1) {
        continue;
      }
      const b1 = points[j]!;
      const b2 = points[(j + 1) % points.length]!;
      if (segmentsIntersect(a1, a2, b1, b2)) {
        return true;
      }
    }
  }
  return false;
}

export function pointInPolygon(point: GeoPoint, polygon: readonly GeoPoint[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const pi = polygon[i]!;
    const pj = polygon[j]!;
    const intersects =
      pi.lat > point.lat !== pj.lat > point.lat &&
      point.lon <
        ((pj.lon - pi.lon) * (point.lat - pi.lat)) / (pj.lat - pi.lat + Number.EPSILON) + pi.lon;
    if (intersects) {
      inside = !inside;
    }
  }
  return inside;
}

export function nearestSegmentIndex(point: GeoPoint, polygon: readonly GeoPoint[]): number {
  if (polygon.length < 2) {
    return 0;
  }
  let bestIdx = 0;
  let best = Number.MAX_VALUE;
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i]!;
    const b = polygon[(i + 1) % polygon.length]!;
    const d = distancePointToSegmentSq(point, a, b);
    if (d < best) {
      best = d;
      bestIdx = i;
    }
  }
  return bestIdx;
}

export function snapToGrid(point: GeoPoint, metres = 2): GeoPoint {
  const latStep = metres / M_PER_DEG_LAT;
  const lonStep = metres / (Math.cos((point.lat * Math.PI) / 180) * M_PER_DEG_LAT);
  return {
    lat: Math.round(point.lat / latStep) * latStep,
    lon: Math.round(point.lon / lonStep) * lonStep,
  };
}

export function magneticSnap(
  point: GeoPoint,
  candidates: readonly GeoPoint[],
  thresholdM = 3,
): GeoPoint {
  let best = point;
  let bestSq = thresholdM * thresholdM;
  const p = toLocalXY(point);
  candidates.forEach(c => {
    const q = toLocalXY(c);
    const dSq = (q.x - p.x) ** 2 + (q.y - p.y) ** 2;
    if (dSq < bestSq) {
      best = c;
      bestSq = dSq;
    }
  });
  return best;
}

function toLocalXY(point: GeoPoint): {x: number; y: number} {
  return {
    x: point.lon * M_PER_DEG_LAT * Math.cos((point.lat * Math.PI) / 180),
    y: point.lat * M_PER_DEG_LAT,
  };
}

function segmentsIntersect(a: GeoPoint, b: GeoPoint, c: GeoPoint, d: GeoPoint): boolean {
  const o1 = orientation(a, b, c);
  const o2 = orientation(a, b, d);
  const o3 = orientation(c, d, a);
  const o4 = orientation(c, d, b);
  return o1 * o2 < 0 && o3 * o4 < 0;
}

function orientation(a: GeoPoint, b: GeoPoint, c: GeoPoint): number {
  return (b.lon - a.lon) * (c.lat - a.lat) - (b.lat - a.lat) * (c.lon - a.lon);
}

function distancePointToSegmentSq(p: GeoPoint, a: GeoPoint, b: GeoPoint): number {
  const px = p.lon;
  const py = p.lat;
  const ax = a.lon;
  const ay = a.lat;
  const bx = b.lon;
  const by = b.lat;
  const dx = bx - ax;
  const dy = by - ay;
  if (dx === 0 && dy === 0) {
    return (px - ax) ** 2 + (py - ay) ** 2;
  }
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  const qx = ax + t * dx;
  const qy = ay + t * dy;
  return (px - qx) ** 2 + (py - qy) ** 2;
}

