import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {ConnectionState} from '../../../core/types/telemetry';
import {GlassPanel} from '../../../ui/components/GlassPanel';
import {useTheme} from '../../../ui/theme/ThemeProvider';

interface TerminalHeaderBarProps {
  readonly connection: ConnectionState;
  readonly armed: boolean;
  readonly modeLabel: string;
  readonly transportLabel: string;
  readonly packetRateHz: number;
  readonly telemetryBitrateKbps: number;
  readonly latencyMs: number;
  readonly frameAgeMs: number;
}

export function TerminalHeaderBar({
  connection,
  armed,
  modeLabel,
  transportLabel,
  packetRateHz,
  telemetryBitrateKbps,
  latencyMs,
  frameAgeMs,
}: TerminalHeaderBarProps): React.JSX.Element {
  const theme = useTheme();

  const connColor =
    connection === ConnectionState.Lost || connection === ConnectionState.Idle
      ? theme.palette.danger
      : connection === ConnectionState.Stale || connection === ConnectionState.Connecting
        ? theme.palette.warn
        : theme.palette.accentCyan;

  return (
    <GlassPanel intensity="strong" elevated style={styles.wrap}>
      <View style={styles.row}>
        <View style={styles.chunk}>
          <Text style={[styles.label, {color: theme.palette.fg400}]}>Link</Text>
          <Text style={[styles.value, {color: connColor}]}>{connection}</Text>
        </View>
        <View style={styles.chunk}>
          <Text style={[styles.label, {color: theme.palette.fg400}]}>Vehicle</Text>
          <Text style={[styles.value, {color: theme.palette.fg100}]}>
            {armed ? 'ARMED' : 'DISARMED'} · {modeLabel}
          </Text>
        </View>
        <View style={styles.chunk}>
          <Text style={[styles.label, {color: theme.palette.fg400}]}>Transport</Text>
          <Text style={[styles.value, {color: theme.palette.accentCyan}]}>
            {transportLabel}
          </Text>
        </View>
      </View>
      <View style={[styles.row, styles.rowMetrics]}>
        <Metric label="Frames/s" value={packetRateHz.toFixed(1)} theme={theme} />
        <Metric label="Est. KB/s" value={telemetryBitrateKbps.toFixed(1)} theme={theme} />
        <Metric label="Latency (ms)" value={latencyMs.toFixed(0)} theme={theme} />
        <Metric label="Frame age (ms)" value={frameAgeMs.toFixed(0)} theme={theme} />
      </View>
    </GlassPanel>
  );
}

function Metric({
  label,
  value,
  theme,
}: {
  label: string;
  value: string;
  theme: ReturnType<typeof useTheme>;
}): React.JSX.Element {
  return (
    <View style={styles.metric}>
      <Text style={[styles.label, {color: theme.palette.fg400}]}>{label}</Text>
      <Text style={[styles.metricVal, {color: theme.palette.fg100}]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  rowMetrics: {
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(120,200,255,0.12)',
  },
  chunk: {minWidth: '28%', flexGrow: 1},
  label: {fontSize: 9, fontWeight: '800', letterSpacing: 1.2},
  value: {fontSize: 12, fontWeight: '700', marginTop: 2},
  metric: {flex: 1, minWidth: 56},
  metricVal: {fontSize: 13, fontWeight: '800'},
});
