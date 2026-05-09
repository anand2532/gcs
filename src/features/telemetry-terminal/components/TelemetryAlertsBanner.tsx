import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';

import {useTheme} from '../../../ui/theme/ThemeProvider';

import type {DiagnosticAlert} from '../diagnostics/telemetryDiagnostics';

interface TelemetryAlertsBannerProps {
  readonly alerts: DiagnosticAlert[];
  readonly dismissed: ReadonlySet<string>;
  readonly onDismiss: (id: string) => void;
}

export function TelemetryAlertsBanner({
  alerts,
  dismissed,
  onDismiss,
}: TelemetryAlertsBannerProps): React.JSX.Element | null {
  const theme = useTheme();
  const visible = alerts.filter(a => !dismissed.has(a.id));
  if (visible.length === 0) {
    return null;
  }

  return (
    <View style={styles.stack}>
      {visible.map(a => (
        <View
          key={a.id}
          style={[
            styles.banner,
            {
              borderColor:
                a.severity === 'critical'
                  ? theme.palette.danger
                  : a.severity === 'warn'
                    ? theme.palette.warn
                    : theme.palette.surfaceLine,
              backgroundColor:
                a.severity === 'critical'
                  ? 'rgba(255,80,80,0.12)'
                  : 'rgba(255,200,80,0.08)',
            },
          ]}>
          <Text style={[styles.code, {color: theme.palette.fg300}]}>{a.code}</Text>
          <Text style={[styles.msg, {color: theme.palette.fg100}]}>{a.message}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss alert"
            hitSlop={10}
            onPress={() => onDismiss(a.id)}
            style={styles.dismiss}>
            <Text style={{color: theme.palette.fg400, fontSize: 16}}>×</Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {gap: 6, marginBottom: 8},
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  code: {fontSize: 10, fontWeight: '800', width: 96},
  msg: {flex: 1, fontSize: 11, fontWeight: '600'},
  dismiss: {paddingLeft: 4},
});
