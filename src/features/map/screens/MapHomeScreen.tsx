/**
 * MapHomeScreen.
 *
 * Phase 1.5 composition:
 *   - <MapView>                         (ESRI satellite | hybrid)
 *       <Camera ref/>
 *       <FlightTrail/>                  (ShapeSource + LineLayer)
 *       <DroneMarker/>                  (MarkerView)
 *     </MapView>
 *   - <HudBar/>                         (top, glass — includes inline compass
 *                                        between metrics and status pills)
 *   - <OfflineProgressOverlay/>         (top-center, glass; only when caching)
 *   - <OfflineControls/>                (top-left, just below HUD)
 *   - <SimControls/>                    (bottom-left)
 *   - <CameraControls/>                 (bottom-right)
 *   - <DroneMarker/>                    (tap marker to arm/disarm; color
 *                                        shifts green <-> red by state)
 *
 * Lifecycle:
 *   - onMount: bind bus -> store, init OfflineManager, start watchdog.
 *   - simulation does NOT auto-start; the user taps the green Start FAB.
 *   - on unmount: stop watchdog and sim (defensive — Phase 1 has only one
 *     screen but later phases may swap it out).
 */

import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  AppState,
  StatusBar,
  StyleSheet,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
} from 'react-native';

import {Camera, type MapViewRef} from '@maplibre/maplibre-react-native';
import {useIsFocused} from '@react-navigation/native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';

import {type MapStyleVariant} from '../../../core/constants/map';
import {log} from '../../../core/logger/Logger';
import {type GeoPoint} from '../../../core/types/geo';
import {OfflineMapManager} from '../../../modules/offline';
import {
  MapVariantStore,
  MissionPlanningUiStore,
} from '../../../modules/persistence/schemas';
import {
  simulationEngine,
  type MissionPreset,
  SimRunState,
  type SimulationState,
} from '../../../modules/simulation';
import {
  bindBusToStore,
  telemetrySourceRegistry,
  telemetryWatchdog,
  useTelemetryStore,
} from '../../../modules/telemetry';
import {HudBar} from '../../../ui/HUD/HudBar';
import {useTheme} from '../../../ui/theme/ThemeProvider';
import {CommandCenterRoot} from '../../command-center/CommandCenterRoot';
import {MissionPlanningOverlays} from '../../mission-planning/components/MissionPlanningOverlays';
import {MissionPlanningPanel} from '../../mission-planning/components/MissionPlanningPanel';
import {useMissionPlanning} from '../../mission-planning/hooks/useMissionPlanning';
import {DroneMarker} from '../components/DroneMarker';
import {FlightTrail} from '../components/FlightTrail';
import {
  CameraControls,
  OfflineControls,
  SimControls,
} from '../components/MapControls';
import {MapView} from '../components/MapView';
import {OfflineProgressOverlay} from '../components/OfflineProgressOverlay';
import {useMapCamera} from '../hooks/useMapCamera';
import {useOfflineDownload} from '../hooks/useOfflineDownload';

bindBusToStore();

export function MapHomeScreen(): React.JSX.Element {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const {width: screenWidth} = useWindowDimensions();
  const isMapFocused = useIsFocused();
  const camera = useMapCamera();

  const mapViewRef = useRef<MapViewRef | null>(null);
  const offline = useOfflineDownload({mapViewRef});

  const [variant, setVariant] = useState<MapStyleVariant>(() =>
    MapVariantStore.load(),
  );

  const [simState, setSimState] = useState<SimulationState>(() =>
    simulationEngine.getState(),
  );
  const planning = useMissionPlanning();
  const [plannerMinimized, setPlannerMinimized] = useState(true);
  const [placementMode, setPlacementMode] = useState<'none' | 'takeoff' | 'landing'>(
    'none',
  );
  const [cameraRailFrame, setCameraRailFrame] = useState<{
    y: number;
    height: number;
  } | null>(null);
  const [plannerHeight, setPlannerHeight] = useState<number>(56);
  const [missionPresets] = useState<readonly MissionPreset[]>(() =>
    simulationEngine.listMissionPresets(),
  );

  const PLANNER_TOP_DOCK = insets.top + 202;
  const PLANNER_GAP = 12;
  const PLANNER_MIN_HEIGHT = 56;

  useEffect(() => {
    telemetrySourceRegistry.attach(simulationEngine);
    telemetryWatchdog.start();
    const unsub = simulationEngine.subscribe(setSimState);
    log.app.info('MapHomeScreen mounted');

    // Defer MapLibre OfflineManager bootstrap to the next frame so the
    // first render (map view, HUD, FABs) hits the screen before native
    // SQLite cache initialisation runs. Initialising on the synchronous
    // first-paint path was causing a >5s ANR on cold launch.
    const handle = requestAnimationFrame(() => {
      OfflineMapManager.init();
    });

    return () => {
      cancelAnimationFrame(handle);
      unsub();
      // Do not hard-stop sim/watchdog on transient activity recreation or
      // foreground interruptions (common on some OEM Android builds). This
      // keeps mission state stable when the app is briefly backgrounded.
      log.app.info('MapHomeScreen unmounted');
    };
  }, []);

  useEffect(() => {
    const savedUi = MissionPlanningUiStore.load();
    if (!savedUi) {
      return;
    }
    setPlannerMinimized(savedUi.minimized);
    setPlacementMode(savedUi.placementMode);
  }, []);

  const persistDraftNow = planning.actions.persistDraftNow;

  useEffect(() => {
    const sub = AppState.addEventListener('change', nextState => {
      if (nextState === 'background' || nextState === 'inactive') {
        persistDraftNow();
        MissionPlanningUiStore.save({
          minimized: plannerMinimized,
          placementMode,
        });
      }
    });
    return () => {
      sub.remove();
    };
  }, [placementMode, plannerMinimized, persistDraftNow]);

  const armed = useTelemetryStore(s => s.armed);

  const initial = useMemo(
    () => ({
      centerCoordinate: [
        camera.initialCamera.center.lon,
        camera.initialCamera.center.lat,
      ],
      zoomLevel: camera.initialCamera.zoom,
      pitch: camera.initialCamera.pitch,
      heading: camera.initialCamera.bearing,
    }),
    [camera.initialCamera],
  );

  const handleStart = (): void => {
    telemetrySourceRegistry.startActive();
  };
  const handlePause = (): void => {
    simulationEngine.pause();
  };
  const handleResume = (): void => {
    simulationEngine.resume();
  };
  const handleReset = (): void => {
    simulationEngine.reset();
  };
  const handleLoadNextMission = (): void => {
    simulationEngine.loadNextMissionPreset();
  };

  const handleToggleFollow = (): void => {
    camera.setFollowDrone(!camera.followDrone);
  };

  const handleArmToggle = (): void => {
    if (simState.run === SimRunState.Idle && !armed) {
      // In Phase 1, arming without a started sim is just a UI toggle. Real
      // safety gating (preflight checklist) lands in a later phase.
      useTelemetryStore.getState().setArmed(true);
      return;
    }
    useTelemetryStore.getState().setArmed(!armed);
  };

  const handleToggleVariant = (): void => {
    const next: MapStyleVariant = variant === 'satellite' ? 'hybrid' : 'satellite';
    setVariant(next);
    MapVariantStore.save(next);
    log.map.event('style.toggle', {variant: next});
  };

  const handleDownload = (): void => {
    offline.downloadVisible().catch(() => undefined);
  };

  const handleMapPress = (lngLat: [number, number]): void => {
    const point: GeoPoint = {lon: lngLat[0], lat: lngLat[1]};
    if (placementMode === 'takeoff') {
      planning.actions.setTakeoff(point);
      setPlacementMode('none');
      return;
    }
    if (placementMode === 'landing') {
      planning.actions.setLanding(point);
      setPlacementMode('none');
      return;
    }
    if (planning.state.enabled) {
      planning.actions.addPoint(point);
    }
  };

  const handleMapLongPress = (lngLat: [number, number]): void => {
    if (!planning.state.enabled) {
      return;
    }
    planning.actions.insertPoint({lon: lngLat[0], lat: lngLat[1]});
  };

  const handleCameraRailLayout = (event: LayoutChangeEvent): void => {
    const {y, height} = event.nativeEvent.layout;
    setCameraRailFrame({y, height});
  };

  const handlePlannerLayout = (event: LayoutChangeEvent): void => {
    const {height} = event.nativeEvent.layout;
    setPlannerHeight(Math.max(PLANNER_MIN_HEIGHT, height));
  };

  const plannerTop = useMemo(() => {
    if (!cameraRailFrame) {
      return PLANNER_TOP_DOCK;
    }
    const preferredTop = PLANNER_TOP_DOCK;
    const plannerBottomIfPreferred = preferredTop + plannerHeight;
    const railTop = cameraRailFrame.y;
    if (plannerBottomIfPreferred + PLANNER_GAP <= railTop) {
      return preferredTop;
    }
    const fallbackTop = railTop - plannerHeight - PLANNER_GAP;
    return Math.max(insets.top + 80, fallbackTop);
  }, [PLANNER_GAP, PLANNER_TOP_DOCK, cameraRailFrame, insets.top, plannerHeight]);

  return (
    <View style={[styles.root, {backgroundColor: theme.palette.bg900}]}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />
      <View style={StyleSheet.absoluteFill}>
        <MapView
          ref={mapViewRef}
          variant={variant}
          onMapPress={handleMapPress}
          onMapLongPress={handleMapLongPress}
          onCameraIdle={camera.handleCameraIdle}
          onUserPan={camera.handleUserPan}>
          <Camera
            ref={camera.cameraRef}
            defaultSettings={{
              centerCoordinate: initial.centerCoordinate,
              zoomLevel: initial.zoomLevel,
              pitch: initial.pitch,
              heading: initial.heading,
            }}
          />
          <FlightTrail />
          {isMapFocused ? (
            <MissionPlanningOverlays
              polygon={planning.state.editor.points}
              path={planning.generatedPath}
              selectedIndex={planning.state.editor.selectedIndex}
            />
          ) : null}
          <DroneMarker
            initialCoordinate={[
              camera.initialCamera.center.lon,
              camera.initialCamera.center.lat,
            ]}
            armed={armed}
            onArmToggle={handleArmToggle}
          />
        </MapView>
      </View>

      <CommandCenterRoot />

      {isMapFocused ? (
        <SafeAreaView
          edges={['top', 'left', 'right']}
          pointerEvents="box-none"
          style={styles.safe}>
          <HudBar />
        </SafeAreaView>
      ) : null}

      {isMapFocused ? (
        <View
          pointerEvents="box-none"
          style={[
            styles.overlaySlot,
            {top: insets.top + 96},
          ]}>
          <OfflineProgressOverlay {...offline} onDismiss={offline.reset} />
        </View>
      ) : null}

      {isMapFocused ? (
        <View
          pointerEvents="box-none"
          style={[
            styles.offlineSlot,
            {top: insets.top + 96, left: theme.spacing.lg},
          ]}>
          <OfflineControls
            variant={variant}
            onToggleVariant={handleToggleVariant}
            download={offline}
            onDownloadPress={handleDownload}
          />
        </View>
      ) : null}

      {isMapFocused ? (
        <View
          onLayout={handlePlannerLayout}
          pointerEvents="box-none"
          style={[
            styles.planningSlot,
            {
              top: plannerTop,
              right: theme.spacing.lg,
              width: plannerMinimized
                ? 150
                : Math.max(240, Math.min(340, screenWidth - theme.spacing.lg * 2)),
            },
          ]}>
          <MissionPlanningPanel
            enabled={planning.state.enabled}
            pointCount={planning.state.editor.points.length}
            placementMode={placementMode}
            minimized={plannerMinimized}
            validation={planning.validation}
            spacingM={planning.state.survey.spacingM}
            overlapPct={planning.state.survey.overlapPct}
            altitudeM={planning.state.survey.altitudeM}
            onToggleMinimized={() => setPlannerMinimized(v => !v)}
            onToggleEnabled={planning.actions.toggleEnabled}
            onUndo={planning.actions.undo}
            onRedo={planning.actions.redo}
            onRemoveLastPoint={planning.actions.removeLastPoint}
            onSetTakeoffMode={() => setPlacementMode('takeoff')}
            onSetLandingMode={() => setPlacementMode('landing')}
            onClearPlacementMode={() => setPlacementMode('none')}
            onRunPreview={planning.actions.runPreviewInSimulation}
            onSpacingUp={() =>
              planning.actions.setSpacing(Math.min(80, planning.state.survey.spacingM + 2))
            }
            onSpacingDown={() =>
              planning.actions.setSpacing(Math.max(6, planning.state.survey.spacingM - 2))
            }
            onAltitudeUp={() =>
              planning.actions.setAltitude(Math.min(140, planning.state.survey.altitudeM + 5))
            }
            onAltitudeDown={() =>
              planning.actions.setAltitude(Math.max(20, planning.state.survey.altitudeM - 5))
            }
          />
        </View>
      ) : null}

      {isMapFocused ? (
        <View
          pointerEvents="box-none"
          style={[
            styles.simSlot,
            {bottom: insets.bottom + theme.spacing.lg, left: theme.spacing.lg},
          ]}>
          <SimControls
            state={simState}
            presets={missionPresets}
            onStart={handleStart}
            onPause={handlePause}
            onResume={handleResume}
            onReset={handleReset}
            onLoadNextMission={handleLoadNextMission}
          />
        </View>
      ) : null}

      {isMapFocused ? (
        <View
          onLayout={handleCameraRailLayout}
          pointerEvents="box-none"
          style={[
            styles.cameraSlot,
            {bottom: insets.bottom + theme.spacing.lg, right: theme.spacing.lg},
          ]}>
          <CameraControls
            followDrone={camera.followDrone}
            onToggleFollow={handleToggleFollow}
            onRecenter={camera.recenter}
            onZoomIn={camera.zoomIn}
            onZoomOut={camera.zoomOut}
          />
        </View>
      ) : null}

    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1},
  safe: {position: 'absolute', top: 0, left: 0, right: 0, zIndex: 42},
  overlaySlot: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  offlineSlot: {position: 'absolute'},
  simSlot: {position: 'absolute'},
  cameraSlot: {position: 'absolute'},
  planningSlot: {position: 'absolute', zIndex: 30},
});
