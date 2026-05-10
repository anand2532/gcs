import React, {useMemo} from 'react';

import {CircleLayer, FillLayer, LineLayer, ShapeSource} from '@maplibre/maplibre-react-native';

import {MISSION_PLANNING_PATH_MAX_VERTICES} from '../../../core/constants/map';
import {type GeoPoint} from '../../../core/types/geo';
import {type PathPoint} from '../../../core/types/missionPlanning';
import {useTheme} from '../../../ui/theme/ThemeProvider';

interface MissionPlanningOverlaysProps {
  readonly polygon: readonly GeoPoint[];
  readonly path: readonly PathPoint[];
  readonly selectedIndex: number | null;
}

export function MissionPlanningOverlays({
  polygon,
  path,
  selectedIndex,
}: MissionPlanningOverlaysProps): React.JSX.Element | null {
  const theme = useTheme();

  const polygonFeature = useMemo(() => {
    if (polygon.length < 3) {
      return null;
    }
    return {
      type: 'Feature' as const,
      geometry: {
        type: 'Polygon' as const,
        coordinates: [[...polygon.map(p => [p.lon, p.lat]), [polygon[0]!.lon, polygon[0]!.lat]]],
      },
      properties: {},
    };
  }, [polygon]);

  const verticesFeature = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: polygon.map((p, idx) => ({
        type: 'Feature' as const,
        geometry: {type: 'Point' as const, coordinates: [p.lon, p.lat]},
        properties: {selected: selectedIndex === idx ? 1 : 0},
      })),
    }),
    [polygon, selectedIndex],
  );

  const pathFeature = useMemo(() => {
    if (path.length < 2) {
      return null;
    }
    const sampled =
      path.length <= MISSION_PLANNING_PATH_MAX_VERTICES
        ? path
        : decimatePathPoints(path, MISSION_PLANNING_PATH_MAX_VERTICES);
    return {
      type: 'Feature' as const,
      geometry: {
        type: 'LineString' as const,
        coordinates: sampled.map(p => [p.lon, p.lat]),
      },
      properties: {},
    };
  }, [path]);

  return (
    <>
      {polygonFeature ? (
        <ShapeSource id="planning.polygon.source" shape={polygonFeature}>
          <FillLayer
            id="planning.polygon.fill"
            style={{fillColor: theme.palette.accentCyan, fillOpacity: 0.12}}
          />
          <LineLayer
            id="planning.polygon.stroke"
            style={{
              lineColor: theme.palette.accentCyan,
              lineWidth: 2,
              lineOpacity: 0.95,
            }}
          />
        </ShapeSource>
      ) : null}
      <ShapeSource id="planning.vertices.source" shape={verticesFeature}>
        <CircleLayer
          id="planning.vertices.layer"
          style={{
            circleColor: theme.palette.bg900,
            circleStrokeColor: theme.palette.accentAmber,
            circleStrokeWidth: 2,
            // Avoid circleRadius expressions on Fabric (Android MLRNStyleValue / ReadableArray typing).
            circleRadius: 6,
          }}
        />
      </ShapeSource>
      {pathFeature ? (
        <ShapeSource id="planning.path.source" shape={pathFeature}>
          <LineLayer
            id="planning.path.layer"
            style={{
              lineColor: theme.palette.accentGreen,
              lineWidth: 2.5,
              lineOpacity: 0.9,
            }}
          />
        </ShapeSource>
      ) : null}
    </>
  );
}

/** Uniform stride sample — preserves endpoints for map stability under huge survey paths. */
function decimatePathPoints(
  path: readonly PathPoint[],
  maxPoints: number,
): PathPoint[] {
  if (path.length <= maxPoints) {
    return [...path];
  }
  const out: PathPoint[] = [];
  const span = path.length - 1;
  const steps = maxPoints - 1;
  for (let i = 0; i < steps; i++) {
    const idx = Math.min(path.length - 1, Math.round((i / steps) * span));
    out.push(path[idx]!);
  }
  const last = path[path.length - 1]!;
  const oLast = out[out.length - 1];
  if (
    !oLast ||
    oLast.lat !== last.lat ||
    oLast.lon !== last.lon
  ) {
    out.push(last);
  }
  return out;
}

