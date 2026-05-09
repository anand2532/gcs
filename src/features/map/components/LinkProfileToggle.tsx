import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';

import {
  type TelemetryLinkProfileKind,
} from '../../../modules/persistence/schemas';
import {useTheme} from '../../../ui/theme/ThemeProvider';

interface LinkProfileToggleProps {
  readonly profile: TelemetryLinkProfileKind;
  readonly onChange: (next: TelemetryLinkProfileKind) => void;
}

export function LinkProfileToggle({
  profile,
  onChange,
}: LinkProfileToggleProps): React.JSX.Element {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Simulation telemetry"
        onPress={() => onChange('simulation')}
        style={[
          styles.chip,
          {
            borderColor:
              profile === 'simulation'
                ? theme.palette.accentCyan
                : theme.palette.surfaceLine,
            backgroundColor:
              profile === 'simulation'
                ? theme.palette.surfaceHigh
                : theme.palette.surface,
          },
        ]}>
        <Text style={[styles.label, {color: theme.palette.fg100}]}>SIM</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="MAVLink UDP telemetry"
        onPress={() => onChange('mavlink_udp')}
        style={[
          styles.chip,
          {
            borderColor:
              profile === 'mavlink_udp'
                ? theme.palette.accentCyan
                : theme.palette.surfaceLine,
            backgroundColor:
              profile === 'mavlink_udp'
                ? theme.palette.surfaceHigh
                : theme.palette.surface,
          },
        ]}>
        <Text style={[styles.label, {color: theme.palette.fg100}]}>UDP</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {flexDirection: 'row', gap: 8, alignItems: 'center'},
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  label: {fontSize: 11, fontWeight: '800', letterSpacing: 0.6},
});
