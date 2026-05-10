import React from 'react';

import {createNativeStackNavigator} from '@react-navigation/native-stack';

import {
  type OrganizationStackParamList,
} from '../../../app/navigation/types';
import {OrganizationFleetScreen} from '../screens/OrganizationFleetScreen';
import {OrganizationWorkspaceScreen} from '../screens/OrganizationWorkspaceScreen';
import {UavControlScreen} from '../screens/UavControlScreen';

const Stack = createNativeStackNavigator<OrganizationStackParamList>();

export function OrganizationNavigator(): React.JSX.Element {
  return (
    <Stack.Navigator
      initialRouteName="OrganizationWorkspace"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: {backgroundColor: '#05080C'},
      }}>
      <Stack.Screen
        name="OrganizationWorkspace"
        component={OrganizationWorkspaceScreen}
        options={{animation: 'fade'}}
      />
      <Stack.Screen
        name="OrganizationFleet"
        component={OrganizationFleetScreen}
        options={{freezeOnBlur: true}}
      />
      <Stack.Screen
        name="UavControl"
        component={UavControlScreen}
        options={{
          animation: 'fade',
          freezeOnBlur: true,
        }}
      />
    </Stack.Navigator>
  );
}
