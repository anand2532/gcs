import {create} from 'zustand';

export type OperationalMode =
  | 'tactical_map'
  | 'org_workspace'
  | 'uav_control'
  | 'other';

interface WorkspaceSessionState {
  readonly mode: OperationalMode;
  /** True when we paused a running sim because the tactical map lost focus. */
  readonly simPausedForNavigation: boolean;
  readonly activeVehicleId: string | null;
  setMode: (mode: OperationalMode) => void;
  setSimPausedForNavigation: (v: boolean) => void;
  setActiveVehicleId: (id: string | null) => void;
}

export const useWorkspaceSessionStore = create<WorkspaceSessionState>(set => ({
  mode: 'tactical_map',
  simPausedForNavigation: false,
  activeVehicleId: null,
  setMode: mode => set({mode}),
  setSimPausedForNavigation: simPausedForNavigation => set({simPausedForNavigation}),
  setActiveVehicleId: activeVehicleId => set({activeVehicleId}),
}));
