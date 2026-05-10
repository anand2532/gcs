import React, {useCallback} from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import {useNavigation} from '@react-navigation/native';
import Animated, {FadeInDown} from 'react-native-reanimated';

import {GlassPanel} from '../../../ui/components/GlassPanel';
import {useTheme} from '../../../ui/theme/ThemeProvider';
import {
  type CommandPanelId,
  useCommandCenterStore,
} from '../state/commandCenterStore';

import type {RootStackParamList} from '../../../app/navigation/types';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

interface HubCard {
  readonly id: Exclude<CommandPanelId, 'hub'>;
  readonly title: string;
  readonly subtitle: string;
}

const CARDS: HubCard[] = [
  {
    id: 'profile',
    title: 'User / Session',
    subtitle: 'Login, roles, profile, session control',
  },
  {
    id: 'missions',
    title: 'Mission Operations',
    subtitle: 'Plans, simulation, replay, offline sorties',
  },
  {
    id: 'diagnostics',
    title: 'Developer / Diagnostics',
    subtitle: 'FPS, inspectors, perf counters',
  },
  {
    id: 'settings',
    title: 'Settings',
    subtitle: 'Map, telemetry, cache, emergency prefs',
  },
];

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function CommandHubPanel(): React.JSX.Element {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const {height: winH} = useWindowDimensions();
  const openPanel = useCommandCenterStore(s => s.openPanel);
  const setOpen = useCommandCenterStore(s => s.setOpen);

  const openTelemetryTerminal = useCallback(() => {
    setOpen(false);
    navigation.navigate('TelemetryTerminal');
  }, [navigation, setOpen]);

  const openOrganizationWorkspace = useCallback(() => {
    setOpen(false);
    navigation.navigate('Organization', {
      screen: 'OrganizationWorkspace',
    });
  }, [navigation, setOpen]);

  const scrollMax = Math.min(winH * 0.52, 500);

  return (
    <ScrollView
      bounces={false}
      keyboardShouldPersistTaps="handled"
      nestedScrollEnabled
      showsVerticalScrollIndicator={false}
      style={[styles.root, {maxHeight: scrollMax}]}
      contentContainerStyle={styles.rootContent}>
      <Text style={[styles.head, {color: theme.palette.fg100}]}>
        COMMAND CENTER
      </Text>
      <Text style={[styles.sub, {color: theme.palette.fg300}]}>
        Tactical shell · live map retained underneath
      </Text>
      <View style={styles.grid}>
        <Animated.View entering={FadeInDown.duration(320).delay(0)}>
          <Pressable
            accessibilityRole="button"
            onPress={openTelemetryTerminal}
            style={({pressed}) => [{opacity: pressed ? 0.85 : 1}]}>
            <GlassPanel elevated style={styles.card}>
              <Text style={[styles.cardTitle, {color: theme.palette.fg100}]}>
                Telemetry Terminal
              </Text>
              <Text style={[styles.cardSub, {color: theme.palette.fg300}]}>
                Live streams, MAVLink inspector, serial debug — full workspace
              </Text>
            </GlassPanel>
          </Pressable>
        </Animated.View>
        <Animated.View entering={FadeInDown.duration(320).delay(45)}>
          <Pressable
            accessibilityRole="button"
            onPress={openOrganizationWorkspace}
            style={({pressed}) => [{opacity: pressed ? 0.85 : 1}]}>
            <GlassPanel elevated style={styles.card}>
              <Text style={[styles.cardTitle, {color: theme.palette.fg100}]}>
                Organization workspace
              </Text>
              <Text style={[styles.cardSub, {color: theme.palette.fg300}]}>
                Fleet HQ · operations · analytics · UAV command surfaces
              </Text>
            </GlassPanel>
          </Pressable>
        </Animated.View>
        {CARDS.map((c, index) => (
          <Animated.View
            key={c.id}
            entering={FadeInDown.duration(320).delay(45 * (index + 2))}>
            <Pressable
              accessibilityRole="button"
              onPress={() => openPanel(c.id)}
              style={({pressed}) => [{opacity: pressed ? 0.85 : 1}]}>
              <GlassPanel elevated style={styles.card}>
                <Text style={[styles.cardTitle, {color: theme.palette.fg100}]}>
                  {c.title}
                </Text>
                <Text
                  style={[styles.cardSub, {color: theme.palette.fg300}]}>
                  {c.subtitle}
                </Text>
              </GlassPanel>
            </Pressable>
          </Animated.View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {width: '100%'},
  rootContent: {
    paddingBottom: 10,
    flexGrow: 1,
  },
  head: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 4,
  },
  sub: {fontSize: 11, marginBottom: 14},
  grid: {gap: 10},
  card: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
  },
  cardTitle: {fontSize: 14, fontWeight: '700'},
  cardSub: {fontSize: 11, marginTop: 4},
});
