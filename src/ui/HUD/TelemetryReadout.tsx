import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {useTheme} from '../theme/ThemeProvider';

interface TelemetryReadoutProps {
  readonly label: string;
  readonly value: string;
  readonly unit?: string;
  readonly accent?: 'cyan' | 'amber' | 'green' | 'neutral' | 'danger';
}

export function TelemetryReadout({
  label,
  value,
  unit,
  accent = 'neutral',
}: TelemetryReadoutProps): React.JSX.Element {
  const theme = useTheme();
  const valueColour = (() => {
    switch (accent) {
      case 'cyan':
        return theme.palette.accentCyan;
      case 'amber':
        return theme.palette.accentAmber;
      case 'green':
        return theme.palette.accentGreen;
      case 'danger':
        return theme.palette.danger;
      case 'neutral':
      default:
        return theme.palette.fg100;
    }
  })();

  return (
    <View style={styles.container}>
      <Text
        style={[
          styles.label,
          {
            color: theme.palette.fg400,
            fontSize: theme.typography.size.xs,
            letterSpacing: theme.typography.letterSpacing.tactical,
          },
        ]}>
        {label}
      </Text>
      <View style={styles.valueRow}>
        <Text
          style={[
            styles.value,
            {color: valueColour, fontSize: theme.typography.size.lg},
          ]}>
          {value}
        </Text>
        {unit ? (
          <Text
            style={[
              styles.unit,
              {color: theme.palette.fg300, fontSize: theme.typography.size.sm},
            ]}>
            {unit}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minWidth: 64,
  },
  label: {
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 2,
  },
  value: {
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  unit: {
    marginLeft: 4,
    fontWeight: '500',
  },
});
