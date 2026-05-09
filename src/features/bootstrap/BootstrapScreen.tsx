import React, {useCallback} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';

import {useNavigation} from '@react-navigation/native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {API_BASE_URL} from '../../core/constants/backend';
import {useSessionStore} from '../../modules/session';
import {GlassPanel} from '../../ui/components/GlassPanel';
import {useTheme} from '../../ui/theme/ThemeProvider';

import type {RootStackParamList} from '../../app/navigation/types';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Bootstrap'>;

/**
 * Bootstrap / API orientation screen. Does not block map access unless product
 * policy enables `REQUIRE_AUTH_GATE` alongside IdP wiring.
 */
export function BootstrapScreen(): React.JSX.Element {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const enterLocalDemo = useSessionStore(s => s.enterLocalDemo);

  const continueLocal = useCallback(() => {
    enterLocalDemo()
      .then(() => {
        navigation.replace('MapHome');
      })
      .catch(() => {});
  }, [enterLocalDemo, navigation]);

  return (
    <SafeAreaView
      style={[styles.root, {backgroundColor: theme.palette.bg900}]}
      edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.inner}>
        <Text style={[styles.headline, {color: theme.palette.fg100}]}>
          Ground Control
        </Text>
        <Text style={[styles.body, {color: theme.palette.fg300}]}>
          Backend URL is {API_BASE_URL ? `set (${API_BASE_URL})` : 'not set'}.
          Configure `src/core/constants/backend.ts` or your release pipeline to
          point at your API gateway. Refresh tokens use the device secure
          enclave via `react-native-keychain`.
        </Text>
        <GlassPanel style={styles.card} elevated intensity="strong">
          <Pressable
            accessibilityRole="button"
            onPress={continueLocal}
            style={styles.button}>
            <Text style={[styles.buttonLabel, {color: theme.palette.accentCyan}]}>
              Continue to map (local demo)
            </Text>
            <Text style={[styles.hint, {color: theme.palette.fg400}]}>
              Clears stale credentials and opens the tactical map without remote
              sign-in.
            </Text>
          </Pressable>
        </GlassPanel>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1},
  inner: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    justifyContent: 'center',
  },
  headline: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 16,
  },
  body: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 28,
  },
  card: {
    padding: 16,
    borderRadius: 14,
  },
  button: {paddingVertical: 4},
  buttonLabel: {fontSize: 15, fontWeight: '700'},
  hint: {fontSize: 11, marginTop: 8, lineHeight: 16},
});
