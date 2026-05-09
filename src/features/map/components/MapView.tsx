/**
 * Thin presentational wrapper around MapLibre's MapView.
 *
 * Why a wrapper:
 *   - Centralises the active map style (object or URL) so the rest of the
 *     UI never imports MapLibre style internals directly.
 *   - Exposes high-level, typed events that the rest of the app cares
 *     about: camera-idle (for persistence) and user-pan (for follow-mode
 *     bookkeeping). These are derived from `onRegionDidChange` and
 *     `onRegionWillChange` respectively, with `isUserInteraction` used to
 *     distinguish a real fingertip from a programmatic camera move.
 *   - Keeps the screen layer ignorant of whether the style is a URL or a
 *     parsed JSON object — Phase 1.5 ships JSON objects, but a future
 *     vector style will likely be a URL again.
 */

import React, {forwardRef, type ReactNode, useCallback} from 'react';
import {StyleSheet} from 'react-native';

import {
  MapView as MLRNMapView,
  type MapViewRef,
} from '@maplibre/maplibre-react-native';

import {
  MAP_STYLE_URL_VARIANTS,
  SATELLITE_STYLE_URL,
  type MapLibreStyle,
  type MapStyleVariant,
} from '../../../core/constants/map';
import {log} from '../../../core/logger/Logger';

export interface MapCameraIdleEvent {
  /** Map center after the move settles. [lon, lat]. */
  readonly center: [number, number];
  readonly zoom: number;
  readonly bearing: number;
  readonly pitch: number;
  /** True when the move came from a user gesture (pan, pinch, rotate). */
  readonly userInitiated: boolean;
}

interface RegionPayload {
  zoomLevel: number;
  heading: number;
  animated: boolean;
  isUserInteraction: boolean;
  visibleBounds: [GeoJSON.Position, GeoJSON.Position];
  pitch: number;
}

type RegionPayloadFeature = GeoJSON.Feature<GeoJSON.Point, RegionPayload>;

interface MapViewProps {
  readonly children?: ReactNode;
  readonly variant?: MapStyleVariant;
  /** Optional, takes priority over `variant`. Either a URL or a style object. */
  readonly mapStyle?: string | MapLibreStyle;
  readonly onMapPress?: (lngLat: [number, number]) => void;
  readonly onMapLongPress?: (lngLat: [number, number]) => void;
  /** Fires when the camera settles after a move. */
  readonly onCameraIdle?: (e: MapCameraIdleEvent) => void;
  /**
   * Fires once at the start of every user-initiated gesture (a real pan,
   * pinch, or rotate — NOT for programmatic moves like
   * `cameraRef.flyTo`). Use this to release follow-mode the moment the
   * pilot grabs the map.
   */
  readonly onUserPan?: () => void;
}

export const MapView = forwardRef<MapViewRef, MapViewProps>(function MapView(
  {
    children,
    variant = 'satellite',
    mapStyle,
    onMapPress,
    onMapLongPress,
    onCameraIdle,
    onUserPan,
  },
  ref,
): React.JSX.Element {
  const handlePress = useCallback(
    (feature: GeoJSON.Feature) => {
      const geometry = feature.geometry;
      if (!geometry || geometry.type !== 'Point') {
        return;
      }
      const coords = geometry.coordinates;
      const lon = coords[0];
      const lat = coords[1];
      if (typeof lon !== 'number' || typeof lat !== 'number') {
        return;
      }
      log.map.debug('press', {lon, lat});
      onMapPress?.([lon, lat]);
    },
    [onMapPress],
  );

  const handleLongPress = useCallback(
    (feature: GeoJSON.Feature) => {
      const geometry = feature.geometry;
      if (!geometry || geometry.type !== 'Point') {
        return;
      }
      const coords = geometry.coordinates;
      const lon = coords[0];
      const lat = coords[1];
      if (typeof lon !== 'number' || typeof lat !== 'number') {
        return;
      }
      onMapLongPress?.([lon, lat]);
    },
    [onMapLongPress],
  );

  const handleRegionWillChange = useCallback(
    (feat: RegionPayloadFeature) => {
      if (!feat?.properties?.isUserInteraction) {
        return;
      }
      onUserPan?.();
    },
    [onUserPan],
  );

  const handleRegionDidChange = useCallback(
    (feat: RegionPayloadFeature) => {
      if (!feat) {
        return;
      }
      const center = feat.geometry?.coordinates as
        | [number, number]
        | undefined;
      if (!center) {
        return;
      }
      onCameraIdle?.({
        center,
        zoom: feat.properties.zoomLevel,
        bearing: feat.properties.heading,
        pitch: feat.properties.pitch,
        userInitiated: feat.properties.isUserInteraction,
      });
    },
    [onCameraIdle],
  );

  const resolvedStyle: string | MapLibreStyle =
    mapStyle ?? MAP_STYLE_URL_VARIANTS[variant] ?? SATELLITE_STYLE_URL;

  return (
    <MLRNMapView
      ref={ref}
      style={StyleSheet.absoluteFill}
      mapStyle={resolvedStyle}
      attributionEnabled
      logoEnabled={false}
      compassEnabled={false}
      regionWillChangeDebounceTime={20}
      regionDidChangeDebounceTime={250}
      onPress={handlePress}
      onLongPress={handleLongPress}
      onRegionWillChange={handleRegionWillChange}
      onRegionDidChange={handleRegionDidChange}>
      {children}
    </MLRNMapView>
  );
});
