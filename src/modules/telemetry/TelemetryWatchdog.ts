/**
 * Telemetry watchdog FSM.
 *
 * States: IDLE -> CONNECTING -> (LIVE | SIM) <-> STALE -> LOST.
 * Drives the link status pill and (in later phases) the auto-reconnect
 * controller for MAVLink/MQTT.
 *
 * Source-of-truth is the timestamp of the last frame on the bus. This file
 * owns the time math; the store only reflects what the watchdog declares.
 */

import {telemetryBus} from './TelemetryBus';
import {useTelemetryStore} from './TelemetryStore';
import {TELEMETRY_FRESHNESS} from '../../core/constants/sim';
import {log} from '../../core/logger/Logger';
import {
  ConnectionState,
  TelemetrySourceKind,
} from '../../core/types/telemetry';
import {now} from '../../core/utils/time';

interface WatchdogHandle {
  start(): void;
  stop(): void;
  isRunning(): boolean;
}

class TelemetryWatchdogImpl implements WatchdogHandle {
  private interval: ReturnType<typeof setInterval> | null = null;
  private unsubBus: (() => void) | null = null;
  private lastFrameAt: number | undefined;
  private lastSource: TelemetrySourceKind | undefined;

  start(): void {
    if (this.interval) {
      return;
    }
    log.watchdog.info('start');
    this.unsubBus = telemetryBus.subscribe(frame => {
      this.lastFrameAt = frame.t;
      this.lastSource = frame.source;
    });
    this.interval = setInterval(() => {
      this.tick();
    }, TELEMETRY_FRESHNESS.watchdogIntervalMs);
    useTelemetryStore.getState().setConnection(ConnectionState.Connecting);
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    if (this.unsubBus) {
      this.unsubBus();
      this.unsubBus = null;
    }
    this.lastFrameAt = undefined;
    this.lastSource = undefined;
    useTelemetryStore.getState().setConnection(ConnectionState.Idle);
    log.watchdog.info('stop');
  }

  isRunning(): boolean {
    return this.interval !== null;
  }

  private tick(): void {
    const lastT = this.lastFrameAt;
    if (lastT === undefined) {
      return;
    }
    const age = now() - lastT;
    const baseLive =
      this.lastSource === TelemetrySourceKind.Simulation
        ? ConnectionState.Sim
        : ConnectionState.Live;

    let next: ConnectionState;
    if (age >= TELEMETRY_FRESHNESS.lostAfterMs) {
      next = ConnectionState.Lost;
    } else if (age >= TELEMETRY_FRESHNESS.staleAfterMs) {
      next = ConnectionState.Stale;
    } else {
      next = baseLive;
    }

    const current = useTelemetryStore.getState().connection;
    if (current !== next) {
      log.watchdog.event('link.state', {
        from: current,
        to: next,
        ageMs: age,
      });
      useTelemetryStore.getState().setConnection(next);
    }
  }
}

export const telemetryWatchdog = new TelemetryWatchdogImpl();
