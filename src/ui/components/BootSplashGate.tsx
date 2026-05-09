/**
 * BootSplashGate.
 *
 * Renders the app's children but overlays {@link BootSplash} on top
 * during the first ~2.3s of cold launch. After the splash signals it
 * is done, the gate stops rendering it so taps reach the map.
 *
 * Mount this INSIDE `AppProviders` so `BootSplash` has access to the
 * app theme. The splash's fade-out is animated; after the fade
 * completes, the gate unmounts the splash component entirely.
 */

import React, {type ReactNode, useState} from 'react';
import {StyleSheet, View} from 'react-native';

import {BootSplash} from './BootSplash';

interface BootSplashGateProps {
  readonly children: ReactNode;
  readonly durationMs?: number;
}

export function BootSplashGate({
  children,
  durationMs,
}: BootSplashGateProps): React.JSX.Element {
  const [done, setDone] = useState(false);
  return (
    <View style={styles.root}>
      {children}
      {done ? null : (
        <BootSplash durationMs={durationMs} onDone={() => setDone(true)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1},
});
