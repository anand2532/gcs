/**
 * Camera controller hook.
 *
 * Owns:
 *   - the user's "follow drone" preference (persisted across launches)
 *   - imperative recenter / zoom helpers exposed to MapControls
 *   - the per-tick camera follow update when in follow mode
 *   - throttled persistence of the camera pose so the next launch opens
 *     where the pilot left off
 *   - a "user-pan disables follow" rule (real fingers always win over the
 *     follow loop)
 *
 * Strategy:
 *   - We hold a `Camera` ref and call `setCamera` with a short
 *     `animationDuration`. MapLibre interpolates between updates natively,
 *     yielding 60fps motion on top of 10 Hz sim updates.
 *   - When the user pans manually (`onUserPan` fires from `MapView`) we
 *     drop follow mode so the camera stops fighting them. They can flip
 *     it back via the FAB.
 *   - `recenter()` re-enables follow AND immediately flies the camera to
 *     the latest known telemetry position, so the user gets a snap of the
 *     drone — not a wait for the next telemetry tick.
 */

import {useCallback, useEffect, useRef, useState} from 'react';

import {type CameraRef} from '@maplibre/maplibre-react-native';

import {recordCameraFollowCommand} from '../../../app/runtime/perfCounters';
import {
  FOLLOW_CAMERA_MAX_HZ,
  FOLLOW_TICK_DURATION_DEGRADED_MS,
  FOLLOW_TICK_DURATION_MS,
  MAP_DEFAULTS,
} from '../../../core/constants/map';
import {log} from '../../../core/logger/Logger';
import {type MapCameraState} from '../../../core/types/geo';
import {ConnectionState, type TelemetryFrame} from '../../../core/types/telemetry';
import {isFiniteLngLat} from '../../../core/utils/geo';
import {trailingThrottle} from '../../../core/utils/throttle';
import {
  MapCameraStore,
  MapFollowStore,
} from '../../../modules/persistence/schemas';
import {
  telemetryBus,
  useTelemetryStore,
} from '../../../modules/telemetry';
import {type MapCameraIdleEvent} from '../components/MapView';

const ZOOM_STEP = 1;
const PERSIST_INTERVAL_MS = 750;

const FOLLOW_CAMERA_INTERVAL_MS = Math.max(
  16,
  Math.ceil(1000 / FOLLOW_CAMERA_MAX_HZ),
);

export interface UseMapCameraOptions {
  /**
   * When false, the follow-camera loop does not subscribe to the bus (map surface
   * unmounted or inactive — saves work while navigation persists this hook).
   */
  readonly surfaceActive?: boolean;
}

export interface UseMapCamera {
  readonly cameraRef: React.RefObject<CameraRef>;
  readonly initialCamera: MapCameraState;
  readonly followDrone: boolean;
  setFollowDrone(next: boolean): void;
  recenter(): void;
  zoomIn(): void;
  zoomOut(): void;
  /** Wire to `<MapView onCameraIdle={handleCameraIdle}/>`. */
  handleCameraIdle(e: MapCameraIdleEvent): void;
  /** Wire to `<MapView onUserPan={handleUserPan}/>`. */
  handleUserPan(): void;
}

export function useMapCamera(opts: UseMapCameraOptions = {}): UseMapCamera {
  const surfaceActive = opts.surfaceActive !== false;
  const cameraRef = useRef<CameraRef>(null);
  const [followDrone, setFollowDroneState] = useState<boolean>(() =>
    MapFollowStore.load(),
  );
  const lastZoom = useRef<number>(MAP_DEFAULTS.followZoom);

  const persisted = useRef<MapCameraState | undefined>(undefined);
  if (persisted.current === undefined) {
    persisted.current = MapCameraStore.load();
  }

  const rawInitial: MapCameraState = persisted.current ?? {
    center: MAP_DEFAULTS.initialCenter,
    zoom: MAP_DEFAULTS.initialZoom,
    bearing: 0,
    pitch: MAP_DEFAULTS.followPitch,
  };

  const initialCamera: MapCameraState = {
    center: isFiniteLngLat(rawInitial.center.lon, rawInitial.center.lat)
      ? rawInitial.center
      : MAP_DEFAULTS.initialCenter,
    zoom: Number.isFinite(rawInitial.zoom) ? rawInitial.zoom : MAP_DEFAULTS.initialZoom,
    bearing: Number.isFinite(rawInitial.bearing) ? rawInitial.bearing : 0,
    pitch: Number.isFinite(rawInitial.pitch) ? rawInitial.pitch : MAP_DEFAULTS.followPitch,
  };
  // Track the seed zoom for relative zoomIn/zoomOut.
  if (lastZoom.current === MAP_DEFAULTS.followZoom) {
    lastZoom.current = initialCamera.zoom;
  }

  const setFollowDrone = useCallback((next: boolean) => {
    setFollowDroneState(next);
    MapFollowStore.save(next);
    log.map.event('follow.toggle', {followDrone: next});
  }, []);

  const handleUserPan = useCallback(() => {
    setFollowDroneState(prev => {
      if (!prev) {
        return prev;
      }
      MapFollowStore.save(false);
      log.map.event('follow.released-by-pan');
      return false;
    });
  }, []);

  const recenter = useCallback(() => {
    setFollowDroneState(true);
    MapFollowStore.save(true);
    log.map.event('camera.recenter');
    const busLast = telemetryBus.getLast();
    const storeFrame = useTelemetryStore.getState().frame;
    const targetLon =
      busLast?.position.lon ?? storeFrame?.position.lon ?? initialCamera.center.lon;
    const targetLat =
      busLast?.position.lat ?? storeFrame?.position.lat ?? initialCamera.center.lat;
    if (!isFiniteLngLat(targetLon, targetLat)) {
      return;
    }
    cameraRef.current?.setCamera({
      centerCoordinate: [targetLon, targetLat],
      zoomLevel: Math.max(MAP_DEFAULTS.followZoom, lastZoom.current),
      animationDuration: MAP_DEFAULTS.recenterDurationMs,
      animationMode: 'flyTo',
    });
  }, [initialCamera.center.lat, initialCamera.center.lon]);

  const zoomIn = useCallback(() => {
    lastZoom.current = Math.min(20, lastZoom.current + ZOOM_STEP);
    cameraRef.current?.setCamera({
      zoomLevel: lastZoom.current,
      animationDuration: 280,
      animationMode: 'easeTo',
    });
  }, []);

  const zoomOut = useCallback(() => {
    lastZoom.current = Math.max(2, lastZoom.current - ZOOM_STEP);
    cameraRef.current?.setCamera({
      zoomLevel: lastZoom.current,
      animationDuration: 280,
      animationMode: 'easeTo',
    });
  }, []);

  // Throttled persistence — write at most once per PERSIST_INTERVAL_MS.
  const persistThrottle = useRef(
    trailingThrottle((state: MapCameraState) => {
      MapCameraStore.save(state);
    }, PERSIST_INTERVAL_MS),
  ).current;

  useEffect(() => () => persistThrottle.flush(), [persistThrottle]);

  const followCameraThrottle = useRef(
    trailingThrottle((frame: TelemetryFrame) => {
      recordCameraFollowCommand();
      const {connection} = useTelemetryStore.getState();
      const dur =
        connection === ConnectionState.Stale ||
        connection === ConnectionState.Lost
          ? FOLLOW_TICK_DURATION_DEGRADED_MS
          : FOLLOW_TICK_DURATION_MS;
      const {lon, lat} = frame.position;
      if (!isFiniteLngLat(lon, lat)) {
        return;
      }
      cameraRef.current?.setCamera({
        centerCoordinate: [lon, lat],
        animationDuration: dur,
        animationMode: 'easeTo',
      });
    }, FOLLOW_CAMERA_INTERVAL_MS),
  ).current;

  // Cancel trailing work on unmount — flushing would deliver one more setCamera()
  // after the MapView/Camera may already be tearing down (native "unmounted" errors).
  useEffect(() => () => followCameraThrottle.cancel(), [followCameraThrottle]);

  const handleCameraIdle = useCallback(
    (e: MapCameraIdleEvent) => {
      lastZoom.current = e.zoom;
      const lon = e.center[0];
      const lat = e.center[1];
      if (!isFiniteLngLat(lon, lat)) {
        return;
      }
      const next: MapCameraState = {
        center: {lat, lon},
        zoom: e.zoom,
        bearing: e.bearing,
        pitch: e.pitch,
      };
      persistThrottle.call(next);
    },
    [persistThrottle],
  );

  // Live follow loop — bus subscription stays cheap; `setCamera` is capped by
  // FOLLOW_CAMERA_MAX_HZ so high sim tick rates cannot overwhelm the bridge.
  useEffect(() => {
    if (!surfaceActive || !followDrone) {
      return;
    }
    return telemetryBus.subscribe(frame => {
      followCameraThrottle.call(frame);
    });
  }, [surfaceActive, followDrone, followCameraThrottle]);

  return {
    cameraRef,
    initialCamera,
    followDrone,
    setFollowDrone,
    recenter,
    zoomIn,
    zoomOut,
    handleCameraIdle,
    handleUserPan,
  };
}
