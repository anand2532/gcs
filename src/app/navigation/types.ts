/**
 * Navigation graph types. Phase 1 has only the home stack; future phases
 * extend this union and add nested navigators per feature folder.
 */

export type RootStackParamList = {
  Bootstrap: undefined;
  MapHome: undefined;
  TelemetryTerminal: undefined;
};

declare global {

  namespace ReactNavigation {

    interface RootParamList extends RootStackParamList {}
  }
}
