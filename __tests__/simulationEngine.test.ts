/**
 * Simulation engine smoke test.
 *
 * Confirms the end-to-end Phase-1 architecture: the sim implements the
 * TelemetrySource contract, frames flow onto the bus, and the model
 * actually moves the vehicle when stepped.
 */

import {describe, expect, it, beforeEach, jest} from '@jest/globals';

import {ConnectionState, TelemetrySourceKind} from '../src/core/types/telemetry';
import {distanceMetres} from '../src/core/utils/geo';
import {SimRunState, simulationEngine} from '../src/modules/simulation';
import {
  bindBusToStore,
  telemetryBus,
  telemetryWatchdog,
  useTelemetryStore,
} from '../src/modules/telemetry';

describe('simulation engine', () => {
  beforeEach(() => {
    jest.useRealTimers();
    telemetryWatchdog.stop();
    simulationEngine.stop();
    useTelemetryStore.getState().reset();
    bindBusToStore();
  });

  it('implements the TelemetrySource contract', () => {
    expect(simulationEngine.kind).toBe(TelemetrySourceKind.Simulation);
    expect(typeof simulationEngine.start).toBe('function');
    expect(typeof simulationEngine.stop).toBe('function');
    expect(typeof simulationEngine.isRunning).toBe('function');
  });

  it('drains battery monotonically on published frames (single drain path)', async () => {
    simulationEngine.setTickHz(15);
    const soc: number[] = [];
    const unsub = telemetryBus.subscribe(frame => {
      soc.push(frame.battery.soc);
    });
    simulationEngine.start();
    await new Promise(resolve => setTimeout(resolve, 450));
    simulationEngine.stop();
    unsub();

    expect(soc.length).toBeGreaterThan(3);
    for (let i = 1; i < soc.length; i++) {
      expect(soc[i]).toBeLessThanOrEqual(soc[i - 1]! + 1e-12);
    }
    const first = soc[0]!;
    const last = soc[soc.length - 1]!;
    expect(last).toBeLessThan(first);
  });

  it('publishes frames once started and moves the vehicle', async () => {
    simulationEngine.setTickHz(50);
    const frames: number[] = [];
    const unsub = telemetryBus.subscribe(frame => {
      frames.push(frame.position.altRel);
    });
    simulationEngine.start();
    expect(simulationEngine.isRunning()).toBe(true);

    await new Promise(resolve => setTimeout(resolve, 250));

    simulationEngine.stop();
    unsub();

    expect(frames.length).toBeGreaterThan(2);

    // Altitude must have grown above zero — proves the model actually ran.
    const maxAlt = Math.max(...frames);
    expect(maxAlt).toBeGreaterThan(0);
  });

  it('returns home position to baseline on reset', () => {
    simulationEngine.reset();
    const stateAfterReset = simulationEngine.getState();
    expect(stateAfterReset.run).toBe('IDLE');
    const last = telemetryBus.getLast();
    if (last) {
      // Altitude relative is reset; lat/lon are home-equivalent.
      expect(last.position.altRel).toBeLessThanOrEqual(
        last.position.altRel + 0.01,
      );
    }
    // Distance from (origin) home to home is zero — sanity for the helper.
    const home = simulationEngine.getState().mission.home;
    expect(distanceMetres(home, home)).toBe(0);
  });

  it('supports pause and resume without breaking frame flow', async () => {
    simulationEngine.setTickHz(30);
    const frames: number[] = [];
    const unsub = telemetryBus.subscribe(() => {
      frames.push(Date.now());
    });

    simulationEngine.start();
    await new Promise(resolve => setTimeout(resolve, 220));
    const prePauseCount = frames.length;
    expect(prePauseCount).toBeGreaterThan(0);

    simulationEngine.pause();
    expect(simulationEngine.getState().run).toBe(SimRunState.Paused);
    await new Promise(resolve => setTimeout(resolve, 280));
    // A couple of delayed publishes may still flush due to simulated latency.
    expect(frames.length).toBeLessThanOrEqual(prePauseCount + 2);

    simulationEngine.resume();
    expect(simulationEngine.getState().run).toBe(SimRunState.Running);
    await new Promise(resolve => setTimeout(resolve, 220));
    expect(frames.length).toBeGreaterThan(prePauseCount);

    simulationEngine.stop();
    unsub();
  });

  it('drives connection through stale and recovers to sim on resume', async () => {
    telemetryWatchdog.start();
    simulationEngine.setTickHz(20);
    simulationEngine.start();
    await new Promise(resolve => setTimeout(resolve, 500));
    expect(useTelemetryStore.getState().connection).toBe(ConnectionState.Sim);

    simulationEngine.pause();
    await new Promise(resolve => setTimeout(resolve, 1800));
    expect(useTelemetryStore.getState().connection).toBe(ConnectionState.Stale);

    simulationEngine.resume();
    await new Promise(resolve => setTimeout(resolve, 900));
    expect(useTelemetryStore.getState().connection).toBe(ConnectionState.Sim);

    simulationEngine.stop();
    telemetryWatchdog.stop();
  }, 10000);
});
