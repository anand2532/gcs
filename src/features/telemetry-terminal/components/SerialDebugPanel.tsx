import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {GlassPanel} from '../../../ui/components/GlassPanel';
import {useTheme} from '../../../ui/theme/ThemeProvider';

/** Placeholder until a native serial / USB transport exposes state. */
export function SerialDebugPanel(): React.JSX.Element {
  const theme = useTheme();

  return (
    <View style={styles.flex}>
      <Text style={[styles.p, {color: theme.palette.fg300}]}>
        Serial / USB link debugging: port, baud, framing errors, and reconnect
        policy will bind here when the vehicle link module is active.
      </Text>
      <GlassPanel intensity="strong" style={styles.card}>
        <Row label="PORT" value="—" theme={theme} />
        <Row label="BAUD" value="—" theme={theme} />
        <Row label="BYTES IN" value="0" theme={theme} />
        <Row label="BYTES OUT" value="0" theme={theme} />
        <Row label="ERRORS" value="0" theme={theme} />
        <Row label="STATUS" value="NO_HARDWARE_BRIDGE" theme={theme} />
      </GlassPanel>
    </View>
  );
}

function Row({
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
      <Text style={[styles.lab, {color: theme.palette.fg400}]}>{label}</Text>
      <Text style={[styles.val, {color: theme.palette.fg100}]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {flex: 1, gap: 10},
  p: {fontSize: 12, lineHeight: 16},
  card: {borderRadius: 12, padding: 12, gap: 8},
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lab: {fontSize: 10, fontWeight: '800', letterSpacing: 1},
  val: {fontSize: 12, fontWeight: '700'},
});
