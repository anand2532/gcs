import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  Alert,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {type MapViewRef} from '@maplibre/maplibre-react-native';
import {
  useFocusEffect,
  useIsFocused,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {
  type OrganizationStackParamList,
} from '../../../app/navigation/types';
import {mavlinkTelemetrySource} from '../../../communication/MavlinkTelemetrySource';
import {type MapStyleVariant} from '../../../core/constants/map';
import {FlightMode} from '../../../core/types/telemetry';
import {globalOverlayRegistry, useOperationalBasemap} from '../../../modules/geospatial';
import {useFleetStore, useWorkspaceSessionStore} from '../../../modules/organization';
import {
  LinkProfileStore,
  MapVariantStore,
  type PersistedLinkProfile,
  type TelemetryLinkProfileKind,
} from '../../../modules/persistence/schemas';
import {
  simulationEngine,
  type MissionPreset,
  type SimulationState,
} from '../../../modules/simulation';
import {
  telemetrySourceRegistry,
  useTelemetryStore,
} from '../../../modules/telemetry';
import {GlassPanel} from '../../../ui/components/GlassPanel';
import {useTheme} from '../../../ui/theme/ThemeProvider';
import {AirspaceOverlay} from '../../map/components/AirspaceOverlay';
import {DroneMarker} from '../../map/components/DroneMarker';
import {FlightTrail} from '../../map/components/FlightTrail';
import {LinkProfileToggle} from '../../map/components/LinkProfileToggle';
import {
  CameraControls,
  SimControls,
} from '../../map/components/MapControls';
import {type MapCameraIdleEvent} from '../../map/components/MapView';
import {useMapCamera} from '../../map/hooks/useMapCamera';
import {TacticalMapSurface} from '../../map/surfaces/TacticalMapSurface';

import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';

type RouteProps = NativeStackScreenProps<
  OrganizationStackParamList,
  'UavControl'
>;
type OrgNav = NativeStackNavigationProp<OrganizationStackParamList, 'UavControl'>;

export function UavControlScreen(): React.JSX.Element {
  const theme = useTheme();
  const navigation = useNavigation<OrgNav>();
  const route = useRoute<RouteProps['route']>();
  const {vehicleId} = route.params;

  const vehicleMeta = useFleetStore(
    useCallback(s => s.vehicles.find(v => v.id === vehicleId), [vehicleId]),
  );

  const frame = useTelemetryStore(s => s.frame);
  const armedGlobal = useTelemetryStore(s => s.armed);
  const isLiveTarget =
    frame !== undefined && frame.vehicleId === vehicleId;
  const armed = isLiveTarget ? armedGlobal : false;

  const mapViewRef = useRef<MapViewRef | null>(null);
  const isFocused = useIsFocused();
  const camera = useMapCamera({surfaceActive: isFocused});

  const [preferredVariant, setPreferredVariant] = useState<MapStyleVariant>(() =>
    MapVariantStore.load(),
  );
  const persistVariant = useCallback((next: MapStyleVariant) => {
    setPreferredVariant(next);
    MapVariantStore.save(next);
  }, []);

  const [mapCenter, setMapCenter] = useState(() => ({
    lon: camera.initialCamera.center.lon,
    lat: camera.initialCamera.center.lat,
  }));

  const basemap = useOperationalBasemap(preferredVariant, persistVariant, mapCenter);

  useEffect(() => {
    globalOverlayRegistry.scheduleFlush(40);
  }, [basemap.effectiveVariant, basemap.styleURL]);

  const handleCameraIdleCombined = useCallback(
    (e: MapCameraIdleEvent) => {
      camera.handleCameraIdle(e);
      setMapCenter({lon: e.center[0], lat: e.center[1]});
    },
    [camera],
  );

  const [linkProfile, setLinkProfile] = useState<PersistedLinkProfile>(() =>
    LinkProfileStore.load(),
  );

  const [simState, setSimState] = useState<SimulationState>(() =>
    simulationEngine.getState(),
  );
  const [missionPresets] = useState<readonly MissionPreset[]>(() =>
    simulationEngine.listMissionPresets(),
  );

  useEffect(() => {
    const unsub = simulationEngine.subscribe(setSimState);
    return () => {
      unsub();
    };
  }, []);

  useEffect(() => {
    if (linkProfile.profile === 'mavlink_udp') {
      mavlinkTelemetrySource.configure({bindPort: linkProfile.udpBindPort});
      telemetrySourceRegistry.attach(mavlinkTelemetrySource);
    } else {
      telemetrySourceRegistry.attach(simulationEngine);
    }
  }, [linkProfile.profile, linkProfile.udpBindPort]);

  useFocusEffect(
    useCallback(() => {
      useWorkspaceSessionStore.getState().setMode('uav_control');
      useWorkspaceSessionStore.getState().setActiveVehicleId(vehicleId);
      return () => {
        useWorkspaceSessionStore.getState().setActiveVehicleId(null);
        useWorkspaceSessionStore.getState().setMode('org_workspace');
      };
    }, [vehicleId]),
  );

  const initial = useMemo(
    () => ({
      centerCoordinate: [
        camera.initialCamera.center.lon,
        camera.initialCamera.center.lat,
      ] as [number, number],
      zoomLevel: camera.initialCamera.zoom,
      pitch: camera.initialCamera.pitch,
      heading: camera.initialCamera.bearing,
    }),
    [camera.initialCamera],
  );

  const handleLinkProfileChange = useCallback((next: TelemetryLinkProfileKind): void => {
    const merged: PersistedLinkProfile = {...linkProfile, profile: next};
    setLinkProfile(merged);
    LinkProfileStore.save(merged);
  }, [linkProfile]);

  const linkMode = linkProfile.profile === 'mavlink_udp';

  const handleStart = (): void => {
    telemetrySourceRegistry.startActive();
  };
  const handlePause = (): void => {
    if (linkProfile.profile === 'simulation') {
      simulationEngine.pause();
    }
  };
  const handleResume = (): void => {
    if (linkProfile.profile === 'simulation') {
      simulationEngine.resume();
    }
  };
  const handleReset = (): void => {
    if (linkProfile.profile === 'simulation') {
      simulationEngine.reset();
    }
  };
  const handleLoadNextMission = (): void => {
    if (linkProfile.profile === 'simulation') {
      simulationEngine.loadNextMissionPreset();
    }
  };

  const handleArmToggle = (): void => {
    if (!isLiveTarget) {
      Alert.alert('No live link', 'Connect to this aircraft or select the live fleet asset.');
      return;
    }
    useTelemetryStore.getState().setArmed(!armed);
  };

  const openDiag = (): void => {
    navigation.getParent()?.navigate('TelemetryTerminal');
  };

  const title = vehicleMeta?.displayName ?? vehicleId;

  return (
    <View style={[styles.root, {backgroundColor: theme.palette.bg900}]}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />
      <View style={StyleSheet.absoluteFill}>
        {isFocused ? (
          <TacticalMapSurface
            mapViewRef={mapViewRef}
            cameraRef={camera.cameraRef}
            variant={basemap.effectiveVariant}
            mapStyle={basemap.styleURL}
            initialCamera={{
              centerCoordinate: initial.centerCoordinate,
              zoomLevel: initial.zoomLevel,
              pitch: initial.pitch,
              heading: initial.heading,
            }}
            onCameraIdle={handleCameraIdleCombined}
            onUserPan={camera.handleUserPan}>
            <FlightTrail />
            <AirspaceOverlay />
            <DroneMarker
              initialCoordinate={initial.centerCoordinate}
              armed={armed}
              onArmToggle={handleArmToggle}
            />
          </TacticalMapSurface>
        ) : (
          <View
            style={[StyleSheet.absoluteFill, {backgroundColor: theme.palette.bg900}]}
          />
        )}
      </View>

      <SafeAreaView
        pointerEvents="box-none"
        style={styles.safeTop}
        edges={['top', 'left', 'right']}>
        <View style={styles.topRow}>
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.goBack()}
            style={styles.backBtn}>
            <Text style={{color: theme.palette.accentCyan, fontWeight: '700'}}>
              Back
            </Text>
          </Pressable>
          <View style={styles.titleBlock}>
            <Text style={[styles.uavTitle, {color: theme.palette.fg100}]} numberOfLines={1}>
              {title}
            </Text>
            <Text style={[styles.uavHint, {color: theme.palette.fg400}]} numberOfLines={1}>
              {vehicleMeta?.model ?? '—'} ·{' '}
              {isLiveTarget ? 'LIVE TELEMETRY' : 'RECORD ONLY'}
            </Text>
          </View>
          <Pressable accessibilityRole="button" onPress={openDiag}>
            <Text style={{color: theme.palette.fg300, fontSize: 11}}>DIAG</Text>
          </Pressable>
        </View>

        <GlassPanel intensity="strong" elevated style={styles.hud}>
          <MiniHud
            theme={theme}
            live={isLiveTarget}
            vehicleId={vehicleId}
          />
        </GlassPanel>
      </SafeAreaView>

      <SafeAreaView
        pointerEvents="box-none"
        style={styles.safeBottom}
        edges={['bottom', 'left', 'right']}>
        <View style={styles.bottomRow}>
          <View style={styles.simCol}>
            <LinkProfileToggle
              profile={linkProfile.profile}
              onChange={handleLinkProfileChange}
            />
            <SimControls
              state={simState}
              presets={missionPresets}
              onStart={handleStart}
              onPause={handlePause}
              onResume={handleResume}
              onReset={handleReset}
              onLoadNextMission={handleLoadNextMission}
              linkMode={linkMode}
            />
          </View>
          <CameraControls
            followDrone={camera.followDrone}
            onToggleFollow={() => camera.setFollowDrone(!camera.followDrone)}
            onRecenter={camera.recenter}
            onZoomIn={camera.zoomIn}
            onZoomOut={camera.zoomOut}
          />
        </View>

        <View style={styles.emergencyRow}>
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              Alert.alert('Emergency', 'Hold-to-confirm UX wires to RTL / land.')
            }
            style={[
              styles.emergencyBtn,
              {borderColor: theme.palette.accentCyan},
            ]}>
            <Text style={{color: theme.palette.accentCyan, fontWeight: '800'}}>
              EMERGENCY HOLD
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              Alert.alert('Mission planner', 'Opens shared planner from map home (demo).')
            }
            style={[
              styles.secondaryBtn,
              {borderColor: theme.palette.surfaceLine},
            ]}>
            <Text style={{color: theme.palette.fg200, fontWeight: '700'}}>
              PLANNER
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

function MiniHud({
  theme,
  live,
  vehicleId,
}: {
  readonly theme: ReturnType<typeof useTheme>;
  readonly live: boolean;
  readonly vehicleId: string;
}): React.JSX.Element {
  const bat = useTelemetryStore(s => {
    const f = s.frame;
    if (!f || f.vehicleId !== vehicleId) {
      return undefined;
    }
    return Math.round(f.battery.soc * 100);
  });
  const mode = useTelemetryStore(s => {
    const f = s.frame;
    if (!f || f.vehicleId !== vehicleId) {
      return FlightMode.Unknown;
    }
    return f.system.mode;
  });
  const meta = useFleetStore(
    useCallback(s => s.vehicles.find(v => v.id === vehicleId), [vehicleId]),
  );

  const batLabel =
    bat !== undefined ? `${bat}%` : meta ? `${Math.round(meta.batterySoc * 100)}%` : '—';

  return (
    <View style={styles.miniHudRow}>
      <Text style={[styles.hudItem, {color: theme.palette.fg100}]}>
        BAT {batLabel}
      </Text>
      <Text style={[styles.hudItem, {color: theme.palette.fg100}]}>
        MODE {live ? mode : '—'}
      </Text>
      <Text style={[styles.hudItem, {color: theme.palette.accentCyan}]}>
        {live ? 'LINK OK' : 'NO LIVE'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1},
  safeTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
  },
  safeBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 50,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 4,
  },
  backBtn: {paddingVertical: 8, paddingHorizontal: 4},
  titleBlock: {flex: 1, alignItems: 'center'},
  uavTitle: {fontSize: 15, fontWeight: '900', letterSpacing: 1},
  uavHint: {fontSize: 10, marginTop: 2},
  hud: {marginHorizontal: 12, marginTop: 10, padding: 12, borderRadius: 12},
  miniHudRow: {flexDirection: 'row', justifyContent: 'space-between'},
  hudItem: {fontSize: 12, fontWeight: '700'},
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 12,
  },
  simCol: {flex: 1, gap: 8},
  emergencyRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  emergencyBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
  },
  secondaryBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
  },
});
