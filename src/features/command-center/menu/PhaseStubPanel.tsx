import React from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';

import {GlassPanel} from '../../../ui/components/GlassPanel';
import {useTheme} from '../../../ui/theme/ThemeProvider';

export interface StubRow {
  readonly title: string;
  readonly hint: string;
}

interface PhaseStubPanelProps {
  readonly title: string;
  readonly subtitle?: string;
  readonly rows: readonly StubRow[];
}

export function PhaseStubPanel({
  title,
  subtitle,
  rows,
}: PhaseStubPanelProps): React.JSX.Element {
  const theme = useTheme();

  return (
    <ScrollView style={styles.flex} showsVerticalScrollIndicator={false}>
      <Text style={[styles.title, {color: theme.palette.fg100}]}>{title}</Text>
      {subtitle ? (
        <Text style={[styles.sub, {color: theme.palette.fg300}]}>
          {subtitle}
        </Text>
      ) : null}
      {rows.map(row => (
        <GlassPanel key={row.title} style={styles.card} elevated>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{disabled: true}}
            disabled>
            <Text style={[styles.rowTitle, {color: theme.palette.fg100}]}>
              {row.title}
            </Text>
            <Text style={[styles.rowHint, {color: theme.palette.fg400}]}>
              {row.hint}
            </Text>
          </Pressable>
        </GlassPanel>
      ))}
      <View style={styles.footer}>
        <Text style={{color: theme.palette.fg400, fontSize: 10}}>
          PHASE 2+ · Backend + RBAC required for live actions
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: {flex: 1},
  title: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  sub: {fontSize: 12, marginBottom: 12},
  card: {
    padding: 12,
    marginBottom: 10,
    borderRadius: 12,
  },
  rowTitle: {fontSize: 13, fontWeight: '600'},
  rowHint: {fontSize: 11, marginTop: 4},
  footer: {paddingVertical: 16},
});
