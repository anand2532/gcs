import React, {useCallback} from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {useNavigation} from '@react-navigation/native';

import {API_BASE_URL} from '../../../core/constants/backend';
import {useSessionStore} from '../../../modules/session';
import {GlassPanel} from '../../../ui/components/GlassPanel';
import {useTheme} from '../../../ui/theme/ThemeProvider';

import type {RootStackParamList} from '../../../app/navigation/types';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function UserSessionPanel(): React.JSX.Element {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const mode = useSessionStore(s => s.mode);
  const userId = useSessionStore(s => s.userId);
  const signOut = useSessionStore(s => s.signOut);

  const onSignOut = useCallback(() => {
    signOut()
      .then(() => {
        Alert.alert('Signed out', 'Running in local offline-capable demo mode.');
      })
      .catch(() => {});
  }, [signOut]);

  const onBootstrap = useCallback(() => {
    navigation.navigate('Bootstrap');
  }, [navigation]);

  return (
    <ScrollView style={styles.flex} showsVerticalScrollIndicator={false}>
      <Text style={[styles.title, {color: theme.palette.fg100}]}>Session</Text>
      <Text style={[styles.sub, {color: theme.palette.fg300}]}>
        Mode: {mode === 'authenticated' ? 'Authenticated' : 'Local demo'} · API{' '}
        {API_BASE_URL ? 'configured' : 'not configured'}
      </Text>
      {userId ? (
        <Text style={[styles.meta, {color: theme.palette.fg400}]}>
          User id: {userId}
        </Text>
      ) : null}

      <GlassPanel style={styles.card} elevated>
        <Pressable
          accessibilityRole="button"
          onPress={onBootstrap}
          style={styles.press}>
          <Text style={[styles.rowTitle, {color: theme.palette.accentCyan}]}>
            Sign-in / API setup
          </Text>
          <Text style={[styles.rowHint, {color: theme.palette.fg400}]}>
            Opens bootstrap screen. Wire OIDC + tokens via session module when
            ready.
          </Text>
        </Pressable>
      </GlassPanel>

      <GlassPanel style={styles.card} elevated>
        <Pressable
          accessibilityRole="button"
          onPress={onSignOut}
          style={styles.press}>
          <Text style={[styles.rowTitle, {color: theme.palette.fg100}]}>
            Clear credentials
          </Text>
          <Text style={[styles.rowHint, {color: theme.palette.fg400}]}>
            Removes refresh token from secure storage and returns to local demo.
          </Text>
        </Pressable>
      </GlassPanel>

      <View style={styles.footer}>
        <Text style={{color: theme.palette.fg400, fontSize: 10}}>
          RBAC capabilities attach when your IdP/API issues tokens — see
          organization policies sync.
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
  sub: {fontSize: 12, marginBottom: 8},
  meta: {fontSize: 11, marginBottom: 12},
  card: {
    padding: 12,
    marginBottom: 10,
    borderRadius: 12,
  },
  press: {paddingVertical: 2},
  rowTitle: {fontSize: 13, fontWeight: '600'},
  rowHint: {fontSize: 11, marginTop: 4},
  footer: {paddingVertical: 16},
});
