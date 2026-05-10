import React, {useEffect, useMemo} from 'react';

import {FillLayer, LineLayer, ShapeSource} from '@maplibre/maplibre-react-native';

import {AirspaceStore, globalOverlayRegistry} from '../../../modules/geospatial';
import {useTheme} from '../../../ui/theme/ThemeProvider';

import type {FeatureCollection} from 'geojson';

/**
 * Restricted / caution airspace footprints from local cache + bundled demo data.
 */
export function AirspaceOverlay(): React.JSX.Element | null {
  const theme = useTheme();

  const shape = useMemo(() => AirspaceStore.getMapOverlayGeoJson(), []);

  useEffect(() => {
    globalOverlayRegistry.scheduleFlush(24);
  }, [shape]);

  if (!shape.features.length) {
    return null;
  }

  return (
    <ShapeSource
      id="airspace.restricted"
      shape={shape as unknown as FeatureCollection}
    >
      <FillLayer
        id="airspace.restricted.fill"
        style={{
          fillColor: theme.palette.danger,
          fillOpacity: 0.14,
        }}
      />
      <LineLayer
        id="airspace.restricted.outline"
        style={{
          lineColor: theme.palette.danger,
          lineWidth: 1.2,
          lineOpacity: 0.85,
        }}
      />
    </ShapeSource>
  );
}
