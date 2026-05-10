/**
 * Shared MapLibre surface for tactical screens (main map + per-UAV control).
 * Keeps MapView wiring in one place while screens own overlays and hooks.
 */

import React, {type ReactNode} from 'react';

import {
  Camera,
  type CameraRef,
  type MapViewRef,
} from '@maplibre/maplibre-react-native';

import {
  type MapLibreStyle,
  type MapStyleVariant,
} from '../../../core/constants/map';
import {
  MapView,
  type MapCameraIdleEvent,
} from '../components/MapView';

export interface TacticalMapSurfaceProps {
  readonly mapViewRef: React.RefObject<MapViewRef | null | undefined>;
  readonly cameraRef: React.RefObject<CameraRef>;
  readonly variant: MapStyleVariant;
  readonly mapStyle: string | MapLibreStyle;
  readonly initialCamera: {
    readonly centerCoordinate: [number, number];
    readonly zoomLevel: number;
    readonly pitch: number;
    readonly heading: number;
  };
  readonly onCameraIdle: (e: MapCameraIdleEvent) => void;
  readonly onUserPan: () => void;
  readonly onMapPress?: (lngLat: [number, number]) => void;
  readonly onMapLongPress?: (lngLat: [number, number]) => void;
  readonly children?: ReactNode;
}

export function TacticalMapSurface({
  mapViewRef,
  cameraRef,
  variant,
  mapStyle,
  initialCamera,
  onCameraIdle,
  onUserPan,
  onMapPress,
  onMapLongPress,
  children,
}: TacticalMapSurfaceProps): React.JSX.Element {
  return (
    <MapView
      ref={mapViewRef as React.Ref<MapViewRef>}
      variant={variant}
      mapStyle={mapStyle}
      onMapPress={onMapPress}
      onMapLongPress={onMapLongPress}
      onCameraIdle={onCameraIdle}
      onUserPan={onUserPan}>
      <Camera
        ref={cameraRef}
        defaultSettings={{
          centerCoordinate: initialCamera.centerCoordinate,
          zoomLevel: initialCamera.zoomLevel,
          pitch: initialCamera.pitch,
          heading: initialCamera.heading,
        }}
      />
      {children}
    </MapView>
  );
}
