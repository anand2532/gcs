import React, {useEffect, useState} from 'react';
import {Platform, ScrollView, StyleSheet, Text, View} from 'react-native';

import {getPerfCountersSnapshot} from '../../../app/runtime/perfCounters';
import {useTelemetryStore} from '../../../modules/telemetry';
import {GlassPanel} from '../../../ui/components/GlassPanel';
import {useTheme} from '../../../ui/theme/ThemeProvider';

export function DiagnosticsPanel(): React.JSX.Element {
  const theme = useTheme();
  const [fps, setFps] = useState(0);
  const [counters, setCounters] = useState(getPerfCountersSnapshot());
  const [telemetrySnap, setTelemetrySnap] = useState(() =>
    useTelemetryStore.getState(),
  );

  useEffect(() => {
    const id = setInterval(() => {
      setTelemetrySnap(useTelemetryStore.getState());
    }, 500);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let frames = 0;
    let last = performance.now();
    let rid = 0;
    const tick = (t: number) => {
      frames += 1;
      if (t - last >= 250) {
        setFps(Math.round((frames * 1000) / (t - last)));
        frames = 0;
        last = t;
        setCounters(getPerfCountersSnapshot());
      }
      rid = requestAnimationFrame(tick);
    };
    rid = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rid);
  }, []);

  const framePreview = telemetrySnap.frame
    ? JSON.stringify(
        {
          position: telemetrySnap.frame.position,
          attitude: telemetrySnap.frame.attitude,
          battery: telemetrySnap.frame.battery,
          gps: telemetrySnap.frame.gps,
        },
        null,
        0,
      )
    : '—';

  return (
    <ScrollView style={styles.flex} showsVerticalScrollIndicator={false}>
      <GlassPanel style={styles.card}>
        <Text style={[styles.h, {color: theme.palette.fg100}]}>Runtime</Text>
        <MetricRow
          label="FPS (UI estimate)"
          value={String(fps)}
          theme={theme}
        />
        <MetricRow
          label="Trail redraws (dev)"
          value={String(counters.trailRedraws)}
          theme={theme}
        />
        <MetricRow
          label="Camera follow cmds (dev)"
          value={String(counters.cameraFollowCommands)}
          theme={theme}
        />
        <MetricRow
          label="Overlay registry flushes (dev)"
          value={String(counters.overlayRegistryFlushes)}
          theme={theme}
        />
      </GlassPanel>

      <GlassPanel style={styles.card}>
        <Text style={[styles.h, {color: theme.palette.fg100}]}>Telemetry</Text>
        <MetricRow
          label="Connection"
          value={String(telemetrySnap.connection)}
          theme={theme}
        />
        <MetricRow
          label="Armed"
          value={String(telemetrySnap.armed)}
          theme={theme}
        />
        <MetricRow
          label="Frames applied"
          value={String(telemetrySnap.framesReceived)}
          theme={theme}
        />
        <Text
          style={[
            styles.mono,
            {
              color: theme.palette.fg300,
              fontFamily: Platform.select({
                ios: 'Menlo',
                android: 'monospace',
              }),
            },
          ]}>
          {framePreview}
        </Text>
      </GlassPanel>

      <GlassPanel style={styles.card}>
        <Text style={[styles.h, {color: theme.palette.fg100}]}>Memory</Text>
        <Text style={{color: theme.palette.fg300, fontSize: 12}}>
          Native heap / RSS profiling requires a dedicated build hook — not
          exposed here (honest placeholder).
        </Text>
      </GlassPanel>
    </ScrollView>
  );
}

function MetricRow({
  label,
  value,
  theme,
}: {
  label: string;
  value: string;
  theme: ReturnType<typeof useTheme>;
}): React.JSX.Element {
  return (
    <View style={styles.row}>
      <Text style={{color: theme.palette.fg300, fontSize: 12}}>{label}</Text>
      <Text style={{color: theme.palette.accentCyan, fontSize: 12}}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {flex: 1},
  card: {
    padding: 12,
    marginBottom: 10,
    borderRadius: 12,
  },
  h: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  mono: {
    fontSize: 10,
    marginTop: 8,
  },
});
