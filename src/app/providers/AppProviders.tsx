/**
 * Application-wide providers, composed once at the root.
 *
 * Order matters:
 *   1. GestureHandlerRootView — must wrap everything for RNGH to work.
 *   2. SafeAreaProvider — owned by react-native-safe-area-context.
 *   3. ThemeProvider — supplies dark tactical tokens.
 *   4. NavigationContainer — react-navigation root.
 */

import React, {type ReactNode} from 'react';

import {NavigationContainer, type Theme as NavTheme} from '@react-navigation/native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';

import {theme as appTheme} from '../../core/constants/theme';
import {SessionHydrator} from '../../modules/session';
import {AppErrorBoundary} from '../../ui/components/AppErrorBoundary';
import {ThemeProvider} from '../../ui/theme/ThemeProvider';

const navTheme: NavTheme = {
  dark: true,
  colors: {
    primary: appTheme.palette.accentCyan,
    background: appTheme.palette.bg900,
    card: appTheme.palette.bg800,
    text: appTheme.palette.fg100,
    border: appTheme.palette.surfaceLine,
    notification: appTheme.palette.accentCyan,
  },
  fonts: {
    regular: {fontFamily: 'System', fontWeight: '400'},
    medium: {fontFamily: 'System', fontWeight: '500'},
    bold: {fontFamily: 'System', fontWeight: '700'},
    heavy: {fontFamily: 'System', fontWeight: '800'},
  },
};

interface AppProvidersProps {
  readonly children: ReactNode;
}

export function AppProviders({
  children,
}: AppProvidersProps): React.JSX.Element {
  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <SafeAreaProvider>
        <ThemeProvider>
          <NavigationContainer theme={navTheme}>
            <SessionHydrator>
              <AppErrorBoundary>{children}</AppErrorBoundary>
            </SessionHydrator>
          </NavigationContainer>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
