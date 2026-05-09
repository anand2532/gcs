/**
 * Floating control stacks rendered on top of the map.
 *
 * Layout (absolute positioned by the parent screen):
 *   - Left stack: simulation controls (play/pause, reset)
 *   - Right stack: camera (recenter/follow, zoom in/out)
 *   - Top-right: ARM/DISARM toggle (UI only in Phase 1)
 *
 * Components are intentionally dumb — all state lives upstream so the
 * controls can be rearranged or moved into a settings drawer later.
 */

import React from 'react';
import {Pressable, StyleSheet, View, type ViewStyle} from 'react-native';

import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
// eslint-disable-next-line import/no-named-as-default
import Svg, {Circle, Path} from 'react-native-svg';

import {type MapStyleVariant} from '../../../core/constants/map';
import {
  SimRunState,
  type MissionPreset,
  type SimulationState,
} from '../../../modules/simulation';
import {FAB} from '../../../ui/components/FAB';
import {useTheme} from '../../../ui/theme/ThemeProvider';
import {
  OfflineDownloadStatus,
  type UseOfflineDownloadState,
} from '../hooks/useOfflineDownload';

interface SimControlsProps {
  readonly state: SimulationState;
  readonly presets: readonly MissionPreset[];
  readonly onStart: () => void;
  readonly onPause: () => void;
  readonly onResume: () => void;
  readonly onReset: () => void;
  readonly onLoadNextMission: () => void;
  /** When true, hide simulation-only mission controls (MAVLink live link). */
  readonly linkMode?: boolean;
}

export function SimControls({
  state,
  presets,
  onStart,
  onPause,
  onResume,
  onReset,
  onLoadNextMission,
  linkMode = false,
}: SimControlsProps): React.JSX.Element {
  const isRunning = state.run === SimRunState.Running;
  const isPaused = state.run === SimRunState.Paused;
  const isIdle =
    state.run === SimRunState.Idle || state.run === SimRunState.Completed;

  return (
    <View style={styles.stack}>
      {isIdle ? (
        <FAB
          accessibilityLabel={
            linkMode ? 'Start MAVLink listener' : 'Start simulation'
          }
          glyph="▶"
          label={linkMode ? 'Listen' : 'Start'}
          tone="green"
          active
          onPress={onStart}
        />
      ) : null}
      {!linkMode && isRunning ? (
        <FAB
          accessibilityLabel="Pause simulation"
          glyph="❚❚"
          label="Pause"
          tone="amber"
          active
          onPress={onPause}
        />
      ) : null}
      {!linkMode && isPaused ? (
        <FAB
          accessibilityLabel="Resume simulation"
          glyph="▶"
          label="Resume"
          tone="green"
          active
          onPress={onResume}
        />
      ) : null}
      {!linkMode ? <View style={styles.gap} /> : null}
      {!linkMode ? (
        <FAB
          accessibilityLabel="Load next sample mission"
          glyph="≋"
          label={currentPresetLabel(state.selectedMissionPresetId, presets)}
          tone="cyan"
          onPress={onLoadNextMission}
        />
      ) : null}
      {!linkMode ? <View style={styles.gap} /> : null}
      {!linkMode ? (
        <FAB
          accessibilityLabel="Reset simulation"
          glyph="⟲"
          label="Reset"
          tone="neutral"
          onPress={onReset}
        />
      ) : null}
    </View>
  );
}

function currentPresetLabel(
  selectedMissionPresetId: string,
  presets: readonly MissionPreset[],
): string {
  const selected = presets.find(p => p.id === selectedMissionPresetId);
  if (!selected) {
    return 'Mission';
  }
  if (selected.name.length <= 8) {
    return selected.name;
  }
  return `${selected.name.slice(0, 7)}…`;
}

interface CameraControlsProps {
  readonly followDrone: boolean;
  readonly onToggleFollow: () => void;
  readonly onRecenter: () => void;
  readonly onZoomIn: () => void;
  readonly onZoomOut: () => void;
}

export function CameraControls({
  followDrone,
  onToggleFollow,
  onRecenter,
  onZoomIn,
  onZoomOut,
}: CameraControlsProps): React.JSX.Element {
  return (
    <View style={styles.stack}>
      <FAB
        accessibilityLabel="Recenter on UAV"
        glyph="⌖"
        tone="cyan"
        active
        onPress={onRecenter}
      />
      <View style={styles.gap} />
      <FAB
        accessibilityLabel={followDrone ? 'Disable follow camera' : 'Enable follow camera'}
        glyph={followDrone ? '⦿' : '◌'}
        tone={followDrone ? 'cyan' : 'neutral'}
        active={followDrone}
        onPress={onToggleFollow}
      />
      <View style={styles.gap} />
      <FAB
        accessibilityLabel="Zoom in"
        glyph="+"
        size="sm"
        onPress={onZoomIn}
      />
      <View style={styles.gapSm} />
      <FAB
        accessibilityLabel="Zoom out"
        glyph="−"
        size="sm"
        onPress={onZoomOut}
      />
    </View>
  );
}

interface ArmToggleProps {
  readonly armed: boolean;
  readonly onToggle: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * ArmToggle — the safety-critical primary action.
 *
 * Icon-only, transparent circular button. The tinted border and SVG
 * power glyph are the only visual signal: green border when SAFE, red
 * border when ARMED. The fill is intentionally near-transparent so the
 * map underneath stays visible — a tactical "less is more" choice that
 * matches the rest of the glass UI. Press scales the button down for
 * tactile feedback.
 */
export function ArmToggle({armed, onToggle}: ArmToggleProps): React.JSX.Element {
  const theme = useTheme();
  const scale = useSharedValue(1);

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{scale: scale.value}],
  }));

  const tint = armed ? theme.palette.danger : theme.palette.accentGreen;

  return (
    <AnimatedPressable
      accessibilityLabel={armed ? 'Disarm vehicle' : 'Arm vehicle'}
      accessibilityRole="button"
      hitSlop={12}
      onPressIn={() => {
        scale.value = withSpring(0.92, {mass: 0.4, damping: 14});
      }}
      onPressOut={() => {
        scale.value = withSpring(1, {mass: 0.4, damping: 14});
      }}
      onPress={onToggle}
      style={[pressStyle, armStyles.host]}>
      <View
        style={
          {
            width: ARM_SIZE,
            height: ARM_SIZE,
            borderRadius: ARM_SIZE / 2,
            borderColor: tint,
            borderWidth: 1.5,
            backgroundColor: 'rgba(10,15,22,0.35)',
            alignItems: 'center',
            justifyContent: 'center',
          } as ViewStyle
        }>
        <Svg width={32} height={32} viewBox="0 0 24 24">
          {/* Power-on/off glyph: outer arc + vertical stroke */}
          <Path
            d="M12 3 L12 12"
            stroke={tint}
            strokeWidth={2.4}
            strokeLinecap="round"
            fill="none"
          />
          <Path
            d="M6.6 6.6 A8 8 0 1 0 17.4 6.6"
            stroke={tint}
            strokeWidth={2.2}
            strokeLinecap="round"
            fill="none"
          />
          <Circle
            cx={12}
            cy={12}
            r={11}
            stroke={tint}
            strokeOpacity={0.2}
            strokeWidth={1}
            fill="none"
          />
        </Svg>
      </View>
    </AnimatedPressable>
  );
}

const ARM_SIZE = 60;

const armStyles = StyleSheet.create({
  host: {
    alignSelf: 'center',
  },
});

interface OfflineControlsProps {
  readonly variant: MapStyleVariant;
  readonly onToggleVariant: () => void;
  readonly download: UseOfflineDownloadState;
  readonly onDownloadPress: () => void;
}

export function OfflineControls({
  variant,
  onToggleVariant,
  download,
  onDownloadPress,
}: OfflineControlsProps): React.JSX.Element {
  const isWorking = download.status === OfflineDownloadStatus.Working;
  const isComplete = download.status === OfflineDownloadStatus.Complete;
  const isError = download.status === OfflineDownloadStatus.Errored;

  const dlGlyph = isWorking ? '↻' : isComplete ? '✓' : isError ? '!' : '⤓';
  const dlLabel = isWorking
    ? `${Math.round(download.progress * 100)}%`
    : isComplete
    ? 'Cached'
    : isError
    ? 'Retry'
    : 'Save';
  const dlTone: 'cyan' | 'green' | 'danger' | 'neutral' = isComplete
    ? 'green'
    : isError
    ? 'danger'
    : 'cyan';

  return (
    <View style={styles.row}>
      <FAB
        accessibilityLabel={
          variant === 'satellite'
            ? 'Switch to hybrid map (satellite + labels)'
            : 'Switch to satellite-only map'
        }
        glyph={variant === 'satellite' ? '◐' : '◑'}
        label={variant === 'satellite' ? 'SAT' : 'HYB'}
        tone="cyan"
        active={variant === 'hybrid'}
        onPress={onToggleVariant}
      />
      <View style={styles.gapH} />
      <FAB
        accessibilityLabel={
          isWorking
            ? `Downloading visible area, ${Math.round(download.progress * 100)} percent`
            : isComplete
            ? 'Visible area cached for offline use'
            : isError
            ? 'Retry offline download'
            : 'Download visible area for offline use'
        }
        glyph={dlGlyph}
        label={dlLabel}
        tone={dlTone}
        active={isWorking || isComplete}
        disabled={isWorking}
        onPress={onDownloadPress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gap: {height: 12},
  gapSm: {height: 8},
  gapH: {width: 12},
});
