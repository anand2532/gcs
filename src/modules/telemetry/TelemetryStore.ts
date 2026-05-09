/**
 * Zustand store that mirrors the latest telemetry frame and link state.
 *
 * Performance notes:
 *   - Updates flow from the bus directly into `setState` via a single
 *     subscription set up at module init. No React component is on the
 *     hot path.
 *   - Consumers should always use a *narrow* selector (e.g. `useTelemetry(
 *     s => s.frame?.battery.soc)`) and rely on `subscribeWithSelector`
 *     equality checks to avoid re-rendering for unrelated changes.
 *   - For the per-frame map marker we deliberately skip Zustand entirely
 *     and use Reanimated `SharedValue`s — see `DroneMarker.tsx`.
 */

import {create} from 'zustand';
import {subscribeWithSelector} from 'zustand/middleware';

import {telemetryBus} from './TelemetryBus';
import {log} from '../../core/logger/Logger';
import {
  ConnectionState,
  type TelemetryFrame,
  TelemetrySourceKind,
} from '../../core/types/telemetry';


interface TelemetryState {
  frame: TelemetryFrame | undefined;
  /** Source-driven connection state. The watchdog mutates this. */
  connection: ConnectionState;
  /** Has the user toggled the ARM switch? Phase 1 is UI-only. */
  armed: boolean;
  /** Wall clock when the current source was attached. Used for HUD timer. */
  sessionStartedAt: number | undefined;
  /** Stats useful for dev overlays. */
  framesReceived: number;
}

interface TelemetryActions {
  setConnection(next: ConnectionState): void;
  setArmed(armed: boolean): void;
  startSession(): void;
  endSession(): void;
  applyFrame(frame: TelemetryFrame): void;
  reset(): void;
}

export type TelemetryStore = TelemetryState & TelemetryActions;

export const useTelemetryStore = create<TelemetryStore>()(
  subscribeWithSelector(set => ({
    frame: undefined,
    connection: ConnectionState.Idle,
    armed: false,
    sessionStartedAt: undefined,
    framesReceived: 0,

    setConnection(next) {
      set(state =>
        state.connection === next ? state : {connection: next},
      );
    },

    setArmed(armed) {
      set({armed});
      log.telemetry.event(armed ? 'arm.toggle.on' : 'arm.toggle.off', {armed});
    },

    startSession() {
      set({sessionStartedAt: Date.now(), framesReceived: 0});
    },

    endSession() {
      set({sessionStartedAt: undefined});
    },

    applyFrame(frame) {
      set(state => ({
        frame,
        framesReceived: state.framesReceived + 1,
        connection:
          frame.source === TelemetrySourceKind.Simulation
            ? ConnectionState.Sim
            : ConnectionState.Live,
      }));
    },

    reset() {
      set({
        frame: undefined,
        connection: ConnectionState.Idle,
        armed: false,
        sessionStartedAt: undefined,
        framesReceived: 0,
      });
      telemetryBus.reset();
    },
  })),
);

/**
 * Wire the bus into the store exactly once. We do this at module-load time
 * to keep the data path declarative — no component needs to remember to
 * subscribe.
 */
let busBound = false;
export function bindBusToStore(): void {
  if (busBound) {
    return;
  }
  busBound = true;
  telemetryBus.subscribe(frame => {
    useTelemetryStore.getState().applyFrame(frame);
  });
}
