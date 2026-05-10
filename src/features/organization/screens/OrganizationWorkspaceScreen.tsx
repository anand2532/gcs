import React, {useCallback, useMemo} from 'react';
import {
  Alert,
  InteractionManager,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  useFocusEffect,
  useNavigation,
} from '@react-navigation/native';
import Animated, {FadeInDown} from 'react-native-reanimated';
import {SafeAreaView} from 'react-native-safe-area-context';

import {
  type OrganizationStackParamList,
} from '../../../app/navigation/types';
import {ConnectionState} from '../../../core/types/telemetry';
import {
  useFleetStore,
  useOrgStore,
  useWorkspaceSessionStore,
} from '../../../modules/organization';
import {useTelemetryStore} from '../../../modules/telemetry';
import {GlassPanel} from '../../../ui/components/GlassPanel';
import {useTheme} from '../../../ui/theme/ThemeProvider';
import {useCommandCenterStore} from '../../command-center/state/commandCenterStore';

import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

type OrgNav = NativeStackNavigationProp<
  OrganizationStackParamList,
  'OrganizationWorkspace'
>;

export function OrganizationWorkspaceScreen(): React.JSX.Element {
  const theme = useTheme();
  const navigation = useNavigation<OrgNav>();
  const organizations = useOrgStore(s => s.organizations);
  const activeOrgId = useOrgStore(s => s.activeOrgId);
  const orgNameFixed = useMemo(() => {
    const o = organizations.find(x => x.id === activeOrgId);
    return o?.name ?? 'Organization';
  }, [organizations, activeOrgId]);

  const vehicles = useFleetStore(s => s.vehicles);
  const connection = useTelemetryStore(s => s.connection);

  useFocusEffect(
    useCallback(() => {
      useWorkspaceSessionStore.getState().setMode('org_workspace');
    }, []),
  );

  const stats = useMemo(() => {
    const airborne = vehicles.filter(v => v.status === 'airborne').length;
    const activeMissions = vehicles.filter(v => v.missionLabel !== null).length;
    const charging = vehicles.filter(v => v.status === 'charging').length;
    const offline = vehicles.filter(v => v.status === 'offline').length;
    return {airborne, activeMissions, charging, offline, total: vehicles.length};
  }, [vehicles]);

  const linkLabel = useMemo(() => {
    switch (connection) {
      case ConnectionState.Live:
      case ConnectionState.Sim:
        return 'Nominal';
      case ConnectionState.Stale:
        return 'Degraded';
      case ConnectionState.Lost:
      case ConnectionState.Connecting:
        return 'Recovering';
      default:
        return 'Standby';
    }
  }, [connection]);

  const openFleet = useCallback(() => {
    navigation.navigate('OrganizationFleet');
  }, [navigation]);

  const openUav = useCallback(
    (vehicleId: string) => {
      navigation.navigate('UavControl', {vehicleId});
    },
    [navigation],
  );

  const openDiagnosticsRoot = useCallback(() => {
    navigation.getParent()?.navigate('TelemetryTerminal');
  }, [navigation]);

  const openTenantPolicies = useCallback(() => {
    navigation.getParent()?.goBack();
    InteractionManager.runAfterInteractions(() => {
      useCommandCenterStore.getState().openPanel('organization');
    });
  }, [navigation]);

  const preview = useMemo(() => vehicles.slice(0, 6), [vehicles]);

  return (
    <SafeAreaView
      style={[styles.root, {backgroundColor: theme.palette.bg900}]}
      edges={['top', 'left', 'right']}>
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.getParent()?.goBack()}>
          <Text style={{color: theme.palette.accentCyan, fontSize: 14}}>Map</Text>
        </Pressable>
        <View style={{width: 48}} />
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(280)}>
          <Text style={[styles.heroTitle, {color: theme.palette.fg100}]}>
            OPERATIONS WORKSPACE
          </Text>
          <Text style={[styles.heroSub, {color: theme.palette.fg400}]}>
            {orgNameFixed} · fleet command
          </Text>
        </Animated.View>

        <GlassPanel intensity="strong" elevated style={styles.headerCard}>
          <Text style={[styles.sectionLabel, {color: theme.palette.accentCyan}]}>
            Tactical header
          </Text>
          <View style={styles.headerGrid}>
            <HeaderStat label="Connectivity" value={linkLabel} theme={theme} />
            <HeaderStat
              label="Fleet active"
              value={`${stats.airborne}/${stats.total}`}
              theme={theme}
            />
            <HeaderStat
              label="Missions"
              value={String(stats.activeMissions)}
              theme={theme}
            />
            <HeaderStat
              label="Ops users"
              value="—"
              theme={theme}
            />
          </View>
        </GlassPanel>

        <View style={styles.sectionHead}>
          <Text style={[styles.sectionTitle, {color: theme.palette.fg100}]}>
            Fleet overview
          </Text>
          <Pressable onPress={openFleet} accessibilityRole="button">
            <Text style={{color: theme.palette.accentCyan, fontSize: 12}}>
              View all
            </Text>
          </Pressable>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.hRow}>
          {preview.map((v, i) => (
            <Animated.View
              key={v.id}
              entering={FadeInDown.duration(240).delay(i * 40)}>
              <Pressable onPress={() => openUav(v.id)} accessibilityRole="button">
                <GlassPanel elevated style={styles.miniCard}>
                  <Text style={[styles.miniName, {color: theme.palette.fg100}]}>
                    {v.displayName}
                  </Text>
                  <Text style={[styles.miniMeta, {color: theme.palette.fg400}]}>
                    {v.model}
                  </Text>
                  <Text style={[styles.miniStat, {color: theme.palette.fg300}]}>
                    {(v.batterySoc * 100).toFixed(0)}% · {v.status}
                  </Text>
                </GlassPanel>
              </Pressable>
            </Animated.View>
          ))}
        </ScrollView>

        <Text style={[styles.sectionTitle, {color: theme.palette.fg100}]}>
          Operations
        </Text>
        <GlassPanel elevated style={styles.block}>
          <OpRow
            theme={theme}
            title="Active missions"
            detail={`${stats.activeMissions} vehicles assigned`}
          />
          <OpRow
            theme={theme}
            title="Queued"
            detail="Next wave staged (demo)"
          />
          <OpRow theme={theme} title="Alerts" detail={`${stats.offline} offline · ${stats.charging} charging`} />
        </GlassPanel>

        <Text style={[styles.sectionTitle, {color: theme.palette.fg100}]}>
          Analytics
        </Text>
        <GlassPanel elevated style={styles.block}>
          <OpRow theme={theme} title="Flight hours (org)" detail="1,284 h · rolling" />
          <OpRow theme={theme} title="Mission success" detail="97.2% · 30d" />
          <OpRow theme={theme} title="Maintenance" detail="3 aircraft due window" />
        </GlassPanel>

        <Text style={[styles.sectionTitle, {color: theme.palette.fg100}]}>
          Quick actions
        </Text>
        <View style={styles.actions}>
          <QuickAction
            theme={theme}
            title="Fleet roster"
            hint="Search, filter, health"
            onPress={openFleet}
          />
          <QuickAction
            theme={theme}
            title="Assign mission"
            hint="Route to planner (demo)"
            onPress={() =>
              Alert.alert('Assign mission', 'Mission routing will connect to the planner API.')
            }
          />
          <QuickAction
            theme={theme}
            title="Organization zones"
            hint="Geofence sync when API live"
            onPress={() =>
              Alert.alert('Zones', 'Geofence authoring syncs when organization API is configured.')
            }
          />
          <QuickAction
            theme={theme}
            title="Emergency broadcast"
            hint="Notify all field operators"
            onPress={() =>
              Alert.alert('Broadcast', 'Emergency fan-out requires backend broadcast channels.')
            }
          />
          <QuickAction
            theme={theme}
            title="Diagnostics"
            hint="Telemetry terminal"
            onPress={openDiagnosticsRoot}
          />
          <QuickAction
            theme={theme}
            title="Tenant & policies"
            hint="Switch organization, capability preview"
            onPress={openTenantPolicies}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function HeaderStat({
  label,
  value,
  theme,
}: {
  readonly label: string;
  readonly value: string;
  readonly theme: ReturnType<typeof useTheme>;
}): React.JSX.Element {
  return (
    <View style={styles.headerStat}>
      <Text style={[styles.headerStatLabel, {color: theme.palette.fg400}]}>
        {label}
      </Text>
      <Text style={[styles.headerStatValue, {color: theme.palette.fg100}]}>
        {value}
      </Text>
    </View>
  );
}

function OpRow({
  title,
  detail,
  theme,
}: {
  readonly title: string;
  readonly detail: string;
  readonly theme: ReturnType<typeof useTheme>;
}): React.JSX.Element {
  return (
    <View style={styles.opRow}>
      <Text style={[styles.opTitle, {color: theme.palette.fg100}]}>{title}</Text>
      <Text style={[styles.opDetail, {color: theme.palette.fg400}]}>{detail}</Text>
    </View>
  );
}

function QuickAction({
  title,
  hint,
  onPress,
  theme,
}: {
  readonly title: string;
  readonly hint: string;
  readonly onPress: () => void;
  readonly theme: ReturnType<typeof useTheme>;
}): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({pressed}) => [{opacity: pressed ? 0.88 : 1}]}>
      <GlassPanel elevated style={styles.actionCard}>
        <Text style={[styles.actionTitle, {color: theme.palette.fg100}]}>{title}</Text>
        <Text style={[styles.actionHint, {color: theme.palette.fg400}]}>{hint}</Text>
      </GlassPanel>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1},
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  scroll: {flex: 1},
  scrollContent: {paddingBottom: 32, paddingHorizontal: 16},
  heroTitle: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 3,
    marginTop: 8,
  },
  heroSub: {fontSize: 12, marginTop: 6, marginBottom: 14},
  headerCard: {padding: 14, borderRadius: 14, marginBottom: 18},
  sectionLabel: {fontSize: 10, fontWeight: '800', letterSpacing: 1.6, marginBottom: 10},
  headerGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 12},
  headerStat: {width: '47%'},
  headerStatLabel: {fontSize: 10, marginBottom: 4},
  headerStatValue: {fontSize: 15, fontWeight: '700'},
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 10,
    marginTop: 8,
  },
  hRow: {gap: 10, paddingVertical: 4},
  miniCard: {
    width: 132,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  miniName: {fontSize: 13, fontWeight: '700'},
  miniMeta: {fontSize: 10, marginTop: 2},
  miniStat: {fontSize: 10, marginTop: 6},
  block: {padding: 12, borderRadius: 14, gap: 12},
  opRow: {gap: 4},
  opTitle: {fontSize: 13, fontWeight: '600'},
  opDetail: {fontSize: 11},
  actions: {gap: 10},
  actionCard: {padding: 14, borderRadius: 12},
  actionTitle: {fontSize: 14, fontWeight: '700'},
  actionHint: {fontSize: 11, marginTop: 4},
});
