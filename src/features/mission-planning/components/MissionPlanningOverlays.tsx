import React, {useMemo} from 'react';

import {CircleLayer, FillLayer, LineLayer, ShapeSource} from '@maplibre/maplibre-react-native';

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
    return {
      type: 'Feature' as const,
      geometry: {
        type: 'LineString' as const,
        coordinates: path.map(p => [p.lon, p.lat]),
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
            circleRadius: ['case', ['==', ['get', 'selected'], 1], 7, 5],
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

