import React, {useCallback} from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {useOrgStore} from '../../../modules/organization';
import {GlassPanel} from '../../../ui/components/GlassPanel';
import {useTheme} from '../../../ui/theme/ThemeProvider';

export function OrganizationPanel(): React.JSX.Element {
  const theme = useTheme();
  const organizations = useOrgStore(s => s.organizations);
  const activeOrgId = useOrgStore(s => s.activeOrgId);
  const capabilities = useOrgStore(s => s.capabilities);
  const setActiveOrg = useOrgStore(s => s.setActiveOrg);

  const onPick = useCallback(
    (id: string) => {
      setActiveOrg(id);
    },
    [setActiveOrg],
  );

  return (
    <ScrollView style={styles.flex} showsVerticalScrollIndicator={false}>
      <Text style={[styles.title, {color: theme.palette.fg100}]}>
        Organization
      </Text>
      <Text style={[styles.sub, {color: theme.palette.fg300}]}>
        Active tenant drives cached policies (geofence sync when API is
        configured). Switching triggers a policy refresh.
      </Text>

      {organizations.map(org => {
        const selected = org.id === activeOrgId;
        return (
          <GlassPanel key={org.id} style={styles.card} elevated>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{selected}}
              onPress={() => {
                onPick(org.id);
              }}
              style={styles.press}>
              <Text
                style={[
                  styles.rowTitle,
                  {color: selected ? theme.palette.accentCyan : theme.palette.fg100},
                ]}>
                {org.name}
              </Text>
              <Text style={[styles.rowHint, {color: theme.palette.fg400}]}>
                {org.id}
                {selected ? ' · active' : ''}
              </Text>
            </Pressable>
          </GlassPanel>
        );
      })}

      <View style={styles.capSection}>
        <Text style={[styles.capTitle, {color: theme.palette.fg200}]}>
          Capabilities (demo)
        </Text>
        <Text style={[styles.capBody, {color: theme.palette.fg400}]}>
          {capabilities.join(', ')}
        </Text>
      </View>

      <View style={styles.footer}>
        <Text style={{color: theme.palette.fg400, fontSize: 10}}>
          Connect your backend to populate organizations from `/v1/me/orgs` (or
          equivalent) and refine capability strings from JWT scopes.
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
  press: {paddingVertical: 2},
  rowTitle: {fontSize: 13, fontWeight: '600'},
  rowHint: {fontSize: 11, marginTop: 4},
  capSection: {marginTop: 8, marginBottom: 12},
  capTitle: {fontSize: 12, fontWeight: '700', marginBottom: 4},
  capBody: {fontSize: 11, lineHeight: 16},
  footer: {paddingVertical: 16},
});
