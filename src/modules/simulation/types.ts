import {type Mission, type MissionProgress} from '../../core/types/mission';

export const SimRunState = {
  Idle: 'IDLE',
  Running: 'RUNNING',
  Paused: 'PAUSED',
  Completed: 'COMPLETED',
} as const;
export type SimRunState = (typeof SimRunState)[keyof typeof SimRunState];

export interface SimulationState {
  readonly run: SimRunState;
  readonly mission: Mission;
  readonly progress: MissionProgress;
  readonly elapsedMs: number;
  readonly selectedMissionPresetId: string;
}

export type SimStateListener = (state: SimulationState) => void;

export interface MissionPreset {
  readonly id: string;
  readonly name: string;
}
