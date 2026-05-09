/**
 * Application root.
 *
 * Keep this file thin: it owns only the provider composition and the root
 * navigator. Anything domain-specific lives in `src/`.
 *
 * The first import below must be `react-native-gesture-handler` per RNGH
 * setup docs — required before any other component renders.
 */

import 'react-native-gesture-handler';

import React from 'react';
import {LogBox, StatusBar} from 'react-native';

import {enableFreeze} from 'react-native-screens';

import {RootNavigator} from './src/app/navigation/RootNavigator';
import {AppProviders} from './src/app/providers/AppProviders';
import {log} from './src/core/logger/Logger';
import {BootSplashGate} from './src/ui/components/BootSplashGate';

enableFreeze(true);

if (__DEV__) {
  LogBox.ignoreLogs([
    // MapLibre cancels in-flight HTTP tile fetches when unmounting or swapping styles.
    'Request failed due to a permanent error: Canceled',
  ]);
}

log.app.info('boot');

export default function App(): React.JSX.Element {
  return (
    <AppProviders>
      {/* Full-screen tactical canvas: keep React's StatusBar API in sync
          with the native immersive flags applied in MainActivity.onCreate
          and styles.xml so any RN screen that toggles the status bar
          (e.g. modals, alerts) defaults back to hidden. */}
      <StatusBar hidden translucent backgroundColor="transparent" />
      <BootSplashGate>
        <RootNavigator />
      </BootSplashGate>
    </AppProviders>
  );
}
