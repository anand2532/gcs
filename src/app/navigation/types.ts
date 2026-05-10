/**
 * Navigation graph types. Phase 1 has only the home stack; future phases
 * extend this union and add nested navigators per feature folder.
 */

import type {NavigatorScreenParams} from '@react-navigation/native';

export type OrganizationStackParamList = {
  OrganizationWorkspace: undefined;
  OrganizationFleet: undefined;
  UavControl: {readonly vehicleId: string};
};

export type RootStackParamList = {
  Bootstrap: undefined;
  MapHome: undefined;
  TelemetryTerminal: undefined;
  Organization: NavigatorScreenParams<OrganizationStackParamList> | undefined;
};

declare global {

  namespace ReactNavigation {

    interface RootParamList extends RootStackParamList {}
  }
}
