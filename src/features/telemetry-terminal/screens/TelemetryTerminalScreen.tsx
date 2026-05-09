import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {APP_VERSION} from '../../../core/constants/appVersion';
import {TELEMETRY_FRESHNESS} from '../../../core/constants/sim';
import {log, LogLevel} from '../../../core/logger/Logger';
import {
  ConnectionState,
  FlightMode,
  TelemetrySourceKind,
} from '../../../core/types/telemetry';
import {now} from '../../../core/utils/time';
import {SimRunState, simulationEngine} from '../../../modules/simulation';
import {useTelemetryStore} from '../../../modules/telemetry';
import {useTheme} from '../../../ui/theme/ThemeProvider';
import {CommandInspectorPanel} from '../components/CommandInspectorPanel';
import {MavlinkInspectorPanel} from '../components/MavlinkInspectorPanel';
import {SerialDebugPanel} from '../components/SerialDebugPanel';
import {TelemetryAlertsBanner} from '../components/TelemetryAlertsBanner';
import {TerminalHeaderBar} from '../components/TerminalHeaderBar';
import {TerminalStreamTab} from '../components/TerminalStreamTab';
import {computeTelemetryDiagnostics} from '../diagnostics/telemetryDiagnostics';
import {
  buildExportBody,
  type ExportFormat,
} from '../export/terminalExport';
import {
  passesTerminalFilters,
  type TerminalFilterState,
} from '../filters/terminalFilterEngine';
import {
  type CommandEventRecord,
  useCommandEventStore,
} from '../state/commandEventStore';
import {
  ensureTerminalIngestAttached,
  useTerminalPacketStore,
} from '../state/terminalPacketStore';

import type {RootStackParamList} from '../../../app/navigation/types';
import type {
  SessionExportMeta,
  TerminalCategory,
} from '../state/terminalPacketTypes';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

type Nav = NativeStackNavigationProp<RootStackParamList, 'TelemetryTerminal'>;

type MainTab = 'stream' | 'commands' | 'mavlink' | 'serial';

const EXPORT_MAX = 12_000;

export function TelemetryTerminalScreen(): React.JSX.Element {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();

  const lines = useTerminalPacketStore(s => s.lines);
  const clearPackets = useTerminalPacketStore(s => s.clear);
  const cmdEvents = useCommandEventStore(s => s.events);
  const clearCmd = useCommandEventStore(s => s.clear);
  const appendCmd = useCommandEventStore(s => s.append);

  const connection = useTelemetryStore(s => s.connection);
  const armed = useTelemetryStore(s => s.armed);
  const frame = useTelemetryStore(s => s.frame);
  const framesReceived = useTelemetryStore(s => s.framesReceived);

  const [tab, setTab] = useState<MainTab>('stream');
  const [query, setQuery] = useState('');
  const [minLevel, setMinLevel] = useState<LogLevel | 'all'>('all');
  const [disabledCategories, setDisabledCategories] = useState<
    Set<TerminalCategory>
  >(() => new Set());
  const [pauseScroll, setPauseScroll] = useState(false);
  const [dismissedAlerts, setDismissedAlerts] = useState(
    () => new Set<string>(),
  );

  const prevFrames = useRef(framesReceived);
  const prevLineCount = useRef(lines.length);
  const shouldResumeSimOnBlur = useRef(false);
  const [pktRate, setPktRate] = useState(0);
  const [lineRate, setLineRate] = useState(0);

  useEffect(() => {
    ensureTerminalIngestAttached();
  }, []);

  useFocusEffect(
    useCallback(() => {
      const run = simulationEngine.getState().run;
      if (run === SimRunState.Running) {
        simulationEngine.pause();
        shouldResumeSimOnBlur.current = true;
      } else {
        shouldResumeSimOnBlur.current = false;
      }
      return () => {
        if (shouldResumeSimOnBlur.current) {
          simulationEngine.resume();
          shouldResumeSimOnBlur.current = false;
        }
      };
    }, []),
  );

  useEffect(() => {
    const id = setInterval(() => {
      const st = useTelemetryStore.getState();
      const deltaF = st.framesReceived - prevFrames.current;
      prevFrames.current = st.framesReceived;
      setPktRate(deltaF);

      const lc = useTerminalPacketStore.getState().lines.length;
      const deltaL = lc - prevLineCount.current;
      prevLineCount.current = lc;
      setLineRate(deltaL);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const modeLabel = frame?.system.mode ?? FlightMode.Unknown;

  const frameAgeMs = frame
    ? now() - frame.t
    : connection === ConnectionState.Idle
      ? 0
      : 10_000;

  const transportLabel = useMemo(() => {
    if (connection === ConnectionState.Idle) {
      return 'IDLE';
    }
    if (connection === ConnectionState.Sim) {
      return 'SIMULATION';
    }
    const src = frame?.source;
    if (src === TelemetrySourceKind.Simulation) {
      return 'SIMULATION';
    }
    if (src === TelemetrySourceKind.Mavlink) {
      return 'MAVLINK';
    }
    if (src === TelemetrySourceKind.Mqtt) {
      return 'MQTT';
    }
    return 'TELEMETRY';
  }, [connection, frame?.source]);

  const bitrateKbps = useMemo(
    () => Math.min(999, lineRate * 0.25 + pktRate * 0.05),
    [lineRate, pktRate],
  );

  const latencyMs = frame?.link.latencyMs ?? 0;

  const alerts = useMemo(
    () =>
      computeTelemetryDiagnostics({
        connection,
        frame,
        framesReceived,
        lastFrameAgeMs: frameAgeMs,
        staleThresholdMs: TELEMETRY_FRESHNESS.staleAfterMs,
        lostThresholdMs: TELEMETRY_FRESHNESS.lostAfterMs,
      }),
    [connection, frame, framesReceived, frameAgeMs],
  );

  const filterState: TerminalFilterState = useMemo(
    () => ({
      query,
      minLevel,
      disabledCategories,
    }),
    [query, minLevel, disabledCategories],
  );

  const filteredLines = useMemo(
    () => lines.filter(r => passesTerminalFilters(r, filterState)),
    [lines, filterState],
  );

  const metaBase = useCallback(
    (rowCount: number, timeRange?: SessionExportMeta['timeRange']): SessionExportMeta => ({
      exportedAt: Date.now(),
      appVersion: APP_VERSION,
      transportLabel,
      connectionLabel: connection,
      rowCount,
      timeRange,
    }),
    [transportLabel, connection],
  );

  const runExport = useCallback(
    async (format: ExportFormat, rows: typeof lines, label: string) => {
      const slice = rows.slice(-EXPORT_MAX);
      const meta = metaBase(slice.length, {
        from: slice[0]?.t ?? Date.now(),
        to: slice[slice.length - 1]?.t ?? Date.now(),
      });
      const body = buildExportBody(format, slice, meta);
      try {
        await Share.share({
          title: `GCS telemetry (${label})`,
          message: body,
        });
      } catch {
        // dismissed
      }
    },
    [metaBase],
  );

  const openExportMenu = useCallback(() => {
    Alert.alert('Export session', 'Choose format', [
      {
        text: 'JSON lines',
        onPress: () => {
          runExport('jsonl', filteredLines, 'jsonl').catch(() => {});
        },
      },
      {
        text: 'Plain text',
        onPress: () => {
          runExport('txt', filteredLines, 'txt').catch(() => {});
        },
      },
      {
        text: 'CSV',
        onPress: () => {
          runExport('csv', filteredLines, 'csv').catch(() => {});
        },
      },
      {
        text: 'Errors only (JSON)',
        onPress: () => {
          runExport(
            'jsonl',
            filteredLines.filter(r => r.severity === LogLevel.Error),
            'errors-jsonl',
          ).catch(() => {});
        },
      },
      {text: 'Cancel', style: 'cancel'},
    ]);
  }, [filteredLines, runExport]);

  const handleReconnect = useCallback(() => {
    log.telemetry.event('telemetry.terminal.reconnect.requested', {
      transport: transportLabel,
    });
    Alert.alert(
      'Reconnect',
      'Native link manager not attached — request logged for diagnostics.',
    );
  }, [transportLabel]);

  const handleClear = useCallback(() => {
    clearPackets();
    clearCmd();
    setDismissedAlerts(new Set());
  }, [clearCmd, clearPackets]);

  const toggleCategory = useCallback((c: TerminalCategory) => {
    setDisabledCategories(prev => {
      const next = new Set(prev);
      if (next.has(c)) {
        next.delete(c);
      } else {
        next.add(c);
      }
      return next;
    });
  }, []);

  const onReplayCommand = useCallback(
    (e: CommandEventRecord) => {
      log.telemetry.event('telemetry.terminal.command.replay', {
        name: e.name,
      });
      appendCmd({
        t: Date.now(),
        name: `REPLAY:${e.name}`,
        lifecycle: 'SENT',
        payload: {originalId: e.id},
      });
    },
    [appendCmd],
  );

  return (
    <SafeAreaView
      edges={['top', 'left', 'right', 'bottom']}
      style={[styles.safe, {backgroundColor: theme.palette.bg900}]}>
      <View style={[styles.topBar, {borderBottomColor: theme.palette.surfaceLine}]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to map"
          hitSlop={16}
          onPress={() => navigation.goBack()}
          style={styles.back}>
          <Text style={{color: theme.palette.accentCyan, fontWeight: '800'}}>
            ‹ Map
          </Text>
        </Pressable>
        <View style={styles.titleBlock}>
          <Text
            style={[
              styles.title,
              {color: theme.palette.fg100, letterSpacing: theme.typography.letterSpacing.wide},
            ]}>
            Telemetry terminal
          </Text>
          <Text style={[styles.subtitle, {color: theme.palette.fg400}]}>
            Live stream, filters, and inspectors
          </Text>
        </View>
        <View style={{width: 56}} />
      </View>

      <View style={styles.body}>
        <TerminalHeaderBar
          connection={connection}
          armed={armed}
          modeLabel={String(modeLabel)}
          transportLabel={transportLabel}
          packetRateHz={pktRate}
          telemetryBitrateKbps={bitrateKbps}
          latencyMs={latencyMs}
          frameAgeMs={frameAgeMs}
        />

        <TelemetryAlertsBanner
          alerts={alerts}
          dismissed={dismissedAlerts}
          onDismiss={id =>
            setDismissedAlerts(prev => new Set([...prev, id]))
          }
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabs}>
          {(
            [
              ['stream', 'Stream'],
              ['commands', 'Commands'],
              ['mavlink', 'MAVLink'],
              ['serial', 'Serial'],
            ] as const
          ).map(([id, label]) => (
            <Pressable
              key={id}
              accessibilityRole="tab"
              accessibilityState={{selected: tab === id}}
              onPress={() => setTab(id)}
              style={[
                styles.tab,
                {
                  borderColor:
                    tab === id ? theme.palette.accentCyan : theme.palette.surfaceLine,
                  backgroundColor:
                    tab === id ? theme.palette.accentCyanDim : 'transparent',
                },
              ]}>
              <Text
                style={{
                  color: tab === id ? theme.palette.fg100 : theme.palette.fg400,
                  fontSize: 11,
                  fontWeight: '800',
                }}>
                {label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.toolbar}>
          <Pressable onPress={() => setPauseScroll(p => !p)}>
            <Text style={{color: theme.palette.accentCyan, fontSize: 12}}>
              {pauseScroll ? 'Resume' : 'Pause'}
            </Text>
          </Pressable>
          <Pressable onPress={handleClear}>
            <Text style={{color: theme.palette.danger, fontSize: 12}}>Clear</Text>
          </Pressable>
          <Pressable onPress={openExportMenu}>
            <Text style={{color: theme.palette.fg200, fontSize: 12}}>Export</Text>
          </Pressable>
          <Pressable onPress={handleReconnect}>
            <Text style={{color: theme.palette.accentAmber, fontSize: 12}}>
              Reconnect
            </Text>
          </Pressable>
        </View>

        <View style={styles.panel}>
          {tab === 'stream' ? (
            <TerminalStreamTab
              lines={lines}
              pauseScroll={pauseScroll}
              query={query}
              onQueryChange={setQuery}
              minLevel={minLevel}
              onMinLevel={setMinLevel}
              disabledCategories={disabledCategories}
              onToggleCategory={toggleCategory}
            />
          ) : null}
          {tab === 'commands' ? (
            <CommandInspectorPanel
              events={cmdEvents}
              onReplay={onReplayCommand}
            />
          ) : null}
          {tab === 'mavlink' ? <MavlinkInspectorPanel /> : null}
          {tab === 'serial' ? <SerialDebugPanel /> : null}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1},
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  back: {padding: 8, minWidth: 56},
  titleBlock: {flex: 1, alignItems: 'center'},
  title: {fontSize: 13, fontWeight: '900', textTransform: 'capitalize'},
  subtitle: {fontSize: 10, fontWeight: '600', marginTop: 2},
  body: {flex: 1, paddingHorizontal: 10, paddingBottom: 8, gap: 8},
  tabs: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    paddingRight: 4,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  panel: {flex: 1, minHeight: 0},
});
