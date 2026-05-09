import React from 'react';
import {FlatList, Pressable, StyleSheet, Text, View} from 'react-native';

import {SimRunState, simulationEngine} from '../../../modules/simulation';
import {useTelemetryStore} from '../../../modules/telemetry';
import {GlassPanel} from '../../../ui/components/GlassPanel';
import {useTheme} from '../../../ui/theme/ThemeProvider';

import type {CommandEventRecord} from '../state/commandEventStore';

interface CommandInspectorPanelProps {
  readonly events: CommandEventRecord[];
  readonly onReplay?: (e: CommandEventRecord) => void;
}

export function CommandInspectorPanel({
  events,
  onReplay,
}: CommandInspectorPanelProps): React.JSX.Element {
  const theme = useTheme();
  const armed = useTelemetryStore(s => s.armed);
  const simRunning = simulationEngine.getState().run === SimRunState.Running;

  const safeReplay = !armed && !simRunning;

  return (
    <View style={styles.flex}>
      <Text style={[styles.hint, {color: theme.palette.fg300}]}>
        Outgoing commands and acknowledgements. Replay is gated when disarmed /
        sim-safe only.
      </Text>
      <GlassPanel intensity="strong" style={styles.listWrap}>
        <FlatList
          data={[...events].reverse()}
          keyExtractor={i => i.id}
          ListEmptyComponent={
            <Text style={{color: theme.palette.fg400, padding: 12, fontSize: 12}}>
              No command events yet. Arm toggles and future MAVLink COMMAND_LONG
              streams will appear here.
            </Text>
          }
          renderItem={({item}) => (
            <View style={styles.row}>
              <View style={styles.rowMain}>
                <Text style={[styles.cmd, {color: theme.palette.accentCyan}]}>
                  {item.name}
                </Text>
                <Text style={[styles.meta, {color: theme.palette.fg300}]}>
                  {item.lifecycle}
                  {item.latencyMs !== undefined
                    ? ` · ${item.latencyMs} ms`
                    : ''}
                  {item.retryCount ? ` · retries ${item.retryCount}` : ''}
                </Text>
                {item.failureReason ? (
                  <Text style={{color: theme.palette.danger, fontSize: 11}}>
                    {item.failureReason}
                  </Text>
                ) : null}
              </View>
              {onReplay && safeReplay ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Replay ${item.name}`}
                  onPress={() => onReplay(item)}
                  style={styles.replay}>
                  <Text style={{color: theme.palette.accentAmber, fontSize: 11}}>
                    Replay
                  </Text>
                </Pressable>
              ) : null}
            </View>
          )}
        />
      </GlassPanel>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {flex: 1, minHeight: 160},
  hint: {fontSize: 11, marginBottom: 8, lineHeight: 15},
  listWrap: {flex: 1, borderRadius: 12, padding: 0, minHeight: 120},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(120,200,255,0.08)',
  },
  rowMain: {flex: 1},
  cmd: {fontSize: 13, fontWeight: '800'},
  meta: {fontSize: 11, marginTop: 2},
  replay: {paddingLeft: 8},
});
