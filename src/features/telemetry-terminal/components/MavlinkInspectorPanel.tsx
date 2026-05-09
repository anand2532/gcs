import React, {useCallback} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';

import {LogLevel} from '../../../core/logger/Logger';
import {GlassPanel} from '../../../ui/components/GlassPanel';
import {useTheme} from '../../../ui/theme/ThemeProvider';
import {MAVLINK_FIXTURE_ROWS} from '../mavlink/mavlinkFixtures';
import {useTerminalPacketStore} from '../state/terminalPacketStore';

export function MavlinkInspectorPanel(): React.JSX.Element {
  const theme = useTheme();
  const appendSynthetic = useTerminalPacketStore(s => s.appendSynthetic);

  const injectFixtures = useCallback(() => {
    const t0 = Date.now();
    MAVLINK_FIXTURE_ROWS.forEach((row, i) => {
      appendSynthetic({
        ...row,
        id: `${row.id}-inj-${t0}-${i}`,
        t: t0 + i,
      });
    });
  }, [appendSynthetic]);

  return (
    <View style={styles.flex}>
      <Text style={[styles.p, {color: theme.palette.fg300}]}>
        Raw MAVLink inspection. Native serial / UDP bridge will stream decoded
        frames here. Below are shape examples you can inject into the live
        stream for layout review.
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={injectFixtures}
        style={({pressed}) => [
          styles.btn,
          {
            borderColor: theme.palette.accentCyan,
            opacity: pressed ? 0.85 : 1,
          },
        ]}>
        <Text style={{color: theme.palette.accentCyan, fontWeight: '800'}}>
          Inject sample packets
        </Text>
      </Pressable>
      <GlassPanel intensity="strong" style={styles.table}>
        {MAVLINK_FIXTURE_ROWS.map(r => (
          <View key={r.id} style={styles.row}>
            <Text style={[styles.cell, {color: theme.palette.fg200}]}>
              {r.packetType}
            </Text>
            <Text style={[styles.cell, {color: theme.palette.fg300}]}>
              {r.direction} {r.sourceSystem}→{r.targetSystem}
            </Text>
            <Text
              style={[
                styles.cell,
                {
                  color:
                    r.severity === LogLevel.Error
                      ? theme.palette.danger
                      : theme.palette.fg100,
                },
              ]}>
              {r.summary.length > 44 ? `${r.summary.slice(0, 42)}…` : r.summary}
            </Text>
          </View>
        ))}
      </GlassPanel>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {flex: 1, gap: 10},
  p: {fontSize: 12, lineHeight: 16},
  btn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  table: {borderRadius: 12, padding: 8, gap: 6},
  row: {
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(120,200,255,0.1)',
  },
  cell: {fontSize: 10, fontWeight: '600'},
});
