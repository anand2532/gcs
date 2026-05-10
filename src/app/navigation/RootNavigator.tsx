import React from 'react';

import {createNativeStackNavigator} from '@react-navigation/native-stack';

import {type RootStackParamList} from './types';
import {REQUIRE_AUTH_GATE} from '../../core/constants/backend';
import {BootstrapScreen} from '../../features/bootstrap/BootstrapScreen';
import {MapHomeScreen} from '../../features/map/screens/MapHomeScreen';
import {OrganizationNavigator} from '../../features/organization/navigation/OrganizationNavigator';
import {TelemetryTerminalScreen} from '../../features/telemetry-terminal/screens/TelemetryTerminalScreen';


const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator(): React.JSX.Element {
  return (
    <Stack.Navigator
      initialRouteName={REQUIRE_AUTH_GATE ? 'Bootstrap' : 'MapHome'}
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        contentStyle: {backgroundColor: '#05080C'},
      }}>
      <Stack.Screen
        name="Bootstrap"
        component={BootstrapScreen}
        options={{animation: 'fade'}}
      />
      <Stack.Screen
        name="MapHome"
        component={MapHomeScreen}
        options={{freezeOnBlur: true}}
      />
      <Stack.Screen
        name="TelemetryTerminal"
        component={TelemetryTerminalScreen}
        options={{
          animation: 'slide_from_bottom',
          presentation: 'fullScreenModal',
        }}
      />
      <Stack.Screen
        name="Organization"
        component={OrganizationNavigator}
        options={{
          animation: 'fade',
          freezeOnBlur: true,
        }}
      />
    </Stack.Navigator>
  );
}
