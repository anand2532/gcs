import React from 'react';

import {createNativeStackNavigator} from '@react-navigation/native-stack';

import {type RootStackParamList} from './types';
import {MapHomeScreen} from '../../features/map/screens/MapHomeScreen';
import {TelemetryTerminalScreen} from '../../features/telemetry-terminal/screens/TelemetryTerminalScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator(): React.JSX.Element {
  return (
    <Stack.Navigator
      initialRouteName="MapHome"
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        contentStyle: {backgroundColor: '#05080C'},
      }}>
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
    </Stack.Navigator>
  );
}
