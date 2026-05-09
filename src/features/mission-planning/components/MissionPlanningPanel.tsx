import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';

import {type MissionValidationResult} from '../../../core/types/missionPlanning';
import {GlassPanel} from '../../../ui/components/GlassPanel';
import {useTheme} from '../../../ui/theme/ThemeProvider';

interface MissionPlanningPanelProps {
  readonly enabled: boolean;
  readonly pointCount: number;
  readonly placementMode: 'none' | 'takeoff' | 'landing';
  readonly minimized: boolean;
  readonly validation: MissionValidationResult;
  readonly spacingM: number;
  readonly overlapPct: number;
  readonly altitudeM: number;
  readonly onToggleMinimized: () => void;
  readonly onToggleEnabled: () => void;
  readonly onUndo: () => void;
  readonly onRedo: () => void;
  readonly onRemoveLastPoint: () => void;
  readonly onSetTakeoffMode: () => void;
  readonly onSetLandingMode: () => void;
  readonly onClearPlacementMode: () => void;
  readonly onRunPreview: () => void;
  readonly onSpacingUp: () => void;
  readonly onSpacingDown: () => void;
  readonly onAltitudeUp: () => void;
  readonly onAltitudeDown: () => void;
}

export function MissionPlanningPanel({
  enabled,
  pointCount,
  placementMode,
  minimized,
  validation,
  spacingM,
  overlapPct,
  altitudeM,
  onToggleMinimized,
  onToggleEnabled,
  onUndo,
  onRedo,
  onRemoveLastPoint,
  onSetTakeoffMode,
  onSetLandingMode,
  onClearPlacementMode,
  onRunPreview,
  onSpacingUp,
  onSpacingDown,
  onAltitudeUp,
  onAltitudeDown,
}: MissionPlanningPanelProps): React.JSX.Element {
  const theme = useTheme();
  const isPlacementActive = placementMode !== 'none';
  const instruction = !enabled
    ? 'Enable planning, then tap map to draw vertices.'
    : placementMode === 'takeoff'
    ? 'Tap map to set TAKEOFF point.'
    : placementMode === 'landing'
    ? 'Tap map to set LANDING point.'
    : 'Tap map to add point, long-press to insert point.';

  return (
    <GlassPanel
      style={[styles.host, ...(minimized ? [styles.hostMinimized] : [])]}
      elevated>
      <View style={[styles.content, ...(minimized ? [styles.contentMinimized] : [])]}>
        <View style={[styles.headerRow, ...(minimized ? [styles.headerRowMinimized] : [])]}>
          <Text
            style={[
              styles.title,
              ...(minimized ? [styles.titleMinimized] : []),
              {color: theme.palette.fg100},
            ]}>
            {minimized ? 'Mission Planner' : 'Polygon Survey Planner'}
          </Text>
          <ActionButton
            label={minimized ? '⤢' : '—'}
            onPress={onToggleMinimized}
            compact={minimized}
          />
        </View>
        {minimized ? (
          <View style={styles.minimizedRow}>
            <Tag
              label={validation.valid ? 'READY' : 'FIX'}
              tone={validation.valid ? 'green' : 'amber'}
            />
          </View>
        ) : null}
        {minimized ? null : (
          <View style={styles.statusRow}>
            <Tag label={enabled ? 'DRAW ON' : 'DRAW OFF'} tone={enabled ? 'cyan' : 'neutral'} />
            <Tag label={`VERTICES ${pointCount}`} tone="neutral" />
            <Tag
              label={validation.valid ? 'VALID' : 'FIX ISSUES'}
              tone={validation.valid ? 'green' : 'amber'}
            />
            {isPlacementActive ? (
              <Tag
                label={placementMode === 'takeoff' ? 'PLACE TAKEOFF' : 'PLACE LANDING'}
                tone="amber"
              />
            ) : null}
          </View>
        )}
        {minimized ? null : (
          <>
            <Text style={[styles.meta, {color: theme.palette.fg300}]}>
              {instruction}
            </Text>
            <Text
              style={[
                styles.meta,
                {color: validation.valid ? theme.palette.ok : theme.palette.warn},
              ]}>
              ETA {Math.round(validation.estimatedDurationSec / 60)}m | battery ~
              {validation.estimatedBatteryUsePct}% | overlap {overlapPct}%
            </Text>

            <View style={styles.row}>
              <ActionButton
                label={enabled ? 'Finish Draw' : 'Start Draw'}
                active={enabled}
                tone="cyan"
                onPress={onToggleEnabled}
              />
              <ActionButton label="Undo" onPress={onUndo} />
              <ActionButton label="Redo" onPress={onRedo} />
              <ActionButton
                label="Delete Last"
                onPress={onRemoveLastPoint}
                disabled={pointCount === 0}
              />
              <ActionButton
                label="Preview Sim"
                onPress={onRunPreview}
                tone="green"
                active={validation.valid}
                disabled={!validation.valid}
              />
            </View>

            <View style={styles.row}>
              <ActionButton
                label={placementMode === 'takeoff' ? 'Cancel Takeoff' : 'Set Takeoff'}
                onPress={placementMode === 'takeoff' ? onClearPlacementMode : onSetTakeoffMode}
                tone="amber"
                active={placementMode === 'takeoff'}
              />
              <ActionButton
                label={placementMode === 'landing' ? 'Cancel Landing' : 'Set Landing'}
                onPress={placementMode === 'landing' ? onClearPlacementMode : onSetLandingMode}
                tone="amber"
                active={placementMode === 'landing'}
              />
            </View>

            <View style={styles.row}>
              <Stepper
                label="Spacing"
                value={`${spacingM} m`}
                onDecrease={onSpacingDown}
                onIncrease={onSpacingUp}
              />
              <Stepper
                label="Altitude"
                value={`${altitudeM} m`}
                onDecrease={onAltitudeDown}
                onIncrease={onAltitudeUp}
              />
            </View>
          </>
        )}
      </View>
    </GlassPanel>
  );
}

function Tag({
  label,
  tone,
}: {
  label: string;
  tone: 'neutral' | 'cyan' | 'amber' | 'green';
}): React.JSX.Element {
  const theme = useTheme();
  const toneMap = {
    neutral: {bg: theme.palette.surface, fg: theme.palette.fg200, border: theme.palette.surfaceLine},
    cyan: {bg: theme.palette.accentCyanDim, fg: theme.palette.accentCyan, border: theme.palette.accentCyan},
    amber: {bg: theme.palette.accentAmberDim, fg: theme.palette.accentAmber, border: theme.palette.accentAmber},
    green: {bg: theme.palette.accentGreenDim, fg: theme.palette.accentGreen, border: theme.palette.accentGreen},
  }[tone];
  return (
    <View style={[styles.tag, {backgroundColor: toneMap.bg, borderColor: toneMap.border}]}>
      <Text style={[styles.tagLabel, {color: toneMap.fg}]}>{label}</Text>
    </View>
  );
}

function ActionButton({
  label,
  onPress,
  disabled,
  active,
  tone = 'neutral',
  compact = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  active?: boolean;
  tone?: 'neutral' | 'cyan' | 'amber' | 'green';
  compact?: boolean;
}): React.JSX.Element {
  const theme = useTheme();
  const t = {
    neutral: theme.palette.fg200,
    cyan: theme.palette.accentCyan,
    amber: theme.palette.accentAmber,
    green: theme.palette.accentGreen,
  }[tone];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.button,
        ...(compact ? [styles.buttonCompact] : []),
        {
          opacity: disabled ? 0.45 : 1,
          borderColor: active ? t : theme.palette.surfaceLine,
          backgroundColor: active ? `${t}22` : theme.palette.surface,
        },
      ]}>
      <Text
        style={[
          styles.buttonText,
          ...(compact ? [styles.buttonTextCompact] : []),
          {color: active ? t : theme.palette.fg200},
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}

function Stepper({
  label,
  value,
  onDecrease,
  onIncrease,
}: {
  label: string;
  value: string;
  onDecrease: () => void;
  onIncrease: () => void;
}): React.JSX.Element {
  const theme = useTheme();
  return (
    <View style={[styles.stepper, {borderColor: theme.palette.surfaceLine}]}>
      <Text style={[styles.stepperLabel, {color: theme.palette.fg300}]}>{label}</Text>
      <View style={styles.stepperRow}>
        <ActionButton label="-" onPress={onDecrease} />
        <Text style={[styles.stepperValue, {color: theme.palette.fg100}]}>{value}</Text>
        <ActionButton label="+" onPress={onIncrease} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    borderRadius: 12,
    padding: 6,
  },
  hostMinimized: {
    borderRadius: 10,
    padding: 4,
  },
  content: {
    padding: 6,
    gap: 6,
  },
  contentMinimized: {
    padding: 4,
    gap: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  headerRowMinimized: {
    gap: 6,
  },
  title: {
    fontSize: 12,
    letterSpacing: 1,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  titleMinimized: {
    fontSize: 11,
    letterSpacing: 0.8,
  },
  meta: {
    fontSize: 11,
    letterSpacing: 0.5,
    fontWeight: '500',
  },
  statusRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  minimizedRow: {
    alignSelf: 'flex-start',
  },
  tag: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  row: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  button: {
    borderWidth: 1,
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minHeight: 34,
    justifyContent: 'center',
  },
  buttonCompact: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minHeight: 26,
  },
  buttonText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  buttonTextCompact: {
    fontSize: 10,
    letterSpacing: 0.2,
  },
  stepper: {
    borderWidth: 1,
    borderRadius: 9,
    paddingHorizontal: 8,
    paddingVertical: 6,
    minWidth: 150,
    flexGrow: 1,
  },
  stepperLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepperValue: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
});

