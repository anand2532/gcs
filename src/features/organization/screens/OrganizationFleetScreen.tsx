import React, {useCallback, useMemo, useState} from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  useFocusEffect,
  useNavigation,
} from '@react-navigation/native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {
  type OrganizationStackParamList,
} from '../../../app/navigation/types';
import {
  type FleetOperationalStatus,
  type FleetVehicle,
  useFleetStore,
  useWorkspaceSessionStore,
} from '../../../modules/organization';
import {GlassPanel} from '../../../ui/components/GlassPanel';
import {useTheme} from '../../../ui/theme/ThemeProvider';

import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

type OrgNav = NativeStackNavigationProp<
  OrganizationStackParamList,
  'OrganizationFleet'
>;

const STATUS_FILTER: readonly (FleetOperationalStatus | 'all')[] = [
  'all',
  'ready',
  'airborne',
  'charging',
  'offline',
  'maintenance',
];

export function OrganizationFleetScreen(): React.JSX.Element {
  const theme = useTheme();
  const navigation = useNavigation<OrgNav>();
  const vehicles = useFleetStore(s => s.vehicles);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<(typeof STATUS_FILTER)[number]>('all');

  useFocusEffect(
    useCallback(() => {
      useWorkspaceSessionStore.getState().setMode('org_workspace');
    }, []),
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return vehicles.filter(v => {
      if (status !== 'all' && v.status !== status) {
        return false;
      }
      if (!q) {
        return true;
      }
      return (
        v.displayName.toLowerCase().includes(q) ||
        v.id.toLowerCase().includes(q) ||
        v.model.toLowerCase().includes(q) ||
        v.group.toLowerCase().includes(q)
      );
    });
  }, [vehicles, query, status]);

  const renderItem = useCallback(
    ({item}: {readonly item: FleetVehicle}) => (
      <Pressable
        accessibilityRole="button"
        onPress={() => navigation.navigate('UavControl', {vehicleId: item.id})}
        style={({pressed}) => [{opacity: pressed ? 0.9 : 1}]}>
        <GlassPanel elevated style={styles.card}>
          <View style={styles.cardTop}>
            <Text style={[styles.cardTitle, {color: theme.palette.fg100}]}>
              {item.displayName}
            </Text>
            <Text style={[styles.statusPill, {color: theme.palette.accentCyan}]}>
              {item.status}
            </Text>
          </View>
          <Text style={[styles.cardMeta, {color: theme.palette.fg400}]}>
            {item.model} · {item.group}
          </Text>
          <Text style={[styles.cardStat, {color: theme.palette.fg300}]}>
            BAT {(item.batterySoc * 100).toFixed(0)}% · GPS {item.gpsFixLabel} · SIG{' '}
            {(item.signalStrength * 100).toFixed(0)}%
          </Text>
          {item.missionLabel ? (
            <Text style={[styles.mission, {color: theme.palette.fg200}]}>
              Mission: {item.missionLabel}
            </Text>
          ) : null}
        </GlassPanel>
      </Pressable>
    ),
    [navigation, theme],
  );

  const keyExtractor = useCallback((item: FleetVehicle) => item.id, []);

  return (
    <SafeAreaView
      style={[styles.root, {backgroundColor: theme.palette.bg900}]}
      edges={['top', 'left', 'right']}>
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" onPress={() => navigation.goBack()}>
          <Text style={{color: theme.palette.accentCyan, fontSize: 14}}>Back</Text>
        </Pressable>
        <Text style={[styles.title, {color: theme.palette.fg100}]}>Fleet</Text>
        <View style={{width: 48}} />
      </View>

      <TextInput
        placeholder="Search callsign, model, group…"
        placeholderTextColor={theme.palette.fg400}
        value={query}
        onChangeText={setQuery}
        style={[
          styles.input,
          {
            color: theme.palette.fg100,
            borderColor: theme.palette.surfaceLine,
            backgroundColor: theme.palette.bg800,
          },
        ]}
      />

      <ScrollFilter
        theme={theme}
        active={status}
        onChange={setStatus}
      />

      <FlatList
        data={filtered}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        initialNumToRender={12}
        maxToRenderPerBatch={16}
        windowSize={7}
        removeClippedSubviews
      />
    </SafeAreaView>
  );
}

function ScrollFilter({
  theme,
  active,
  onChange,
}: {
  readonly theme: ReturnType<typeof useTheme>;
  readonly active: FleetOperationalStatus | 'all';
  readonly onChange: (s: FleetOperationalStatus | 'all') => void;
}): React.JSX.Element {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filterRow}>
      {STATUS_FILTER.map(item => {
        const selected = item === active;
        return (
          <Pressable
            key={item}
            accessibilityRole="button"
            accessibilityState={{selected}}
            onPress={() => onChange(item)}
            style={[
              styles.filterChip,
              {
                borderColor: selected ? theme.palette.accentCyan : theme.palette.surfaceLine,
                backgroundColor: selected ? theme.palette.bg800 : theme.palette.bg900,
              },
            ]}>
            <Text
              style={{
                color: selected ? theme.palette.accentCyan : theme.palette.fg300,
                fontSize: 11,
                fontWeight: '700',
              }}>
              {item}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, paddingHorizontal: 16},
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {fontSize: 18, fontWeight: '900', letterSpacing: 2},
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    marginBottom: 10,
  },
  filterRow: {gap: 8, paddingVertical: 6},
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  list: {paddingBottom: 24, gap: 10},
  card: {padding: 14, borderRadius: 14, marginBottom: 10},
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {fontSize: 15, fontWeight: '800'},
  statusPill: {fontSize: 11, fontWeight: '800', textTransform: 'uppercase'},
  cardMeta: {fontSize: 11, marginTop: 4},
  cardStat: {fontSize: 11, marginTop: 8},
  mission: {fontSize: 11, marginTop: 6},
});
