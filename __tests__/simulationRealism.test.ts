import {beforeEach, describe, expect, it, jest} from '@jest/globals';

import {ConnectionState, GpsFix} from '../src/core/types/telemetry';
import {SimRunState, simulationEngine} from '../src/modules/simulation';
import {
  bindBusToStore,
  telemetryBus,
  telemetryWatchdog,
  useTelemetryStore,
} from '../src/modules/telemetry';

async function waitFor(
  predicate: () => boolean,
  timeoutMs: number,
  stepMs = 150,
): Promise<boolean> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (predicate()) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, stepMs));
  }
  return predicate();
}

describe('simulation realism + mission presets', () => {
  beforeEach(() => {
    jest.useRealTimers();
    telemetryWatchdog.stop();
    simulationEngine.stop();
    simulationEngine.setForceLinkOutage(false);
    useTelemetryStore.getState().reset();
    bindBusToStore();
  });

  it('exposes built-in mission presets and can cycle them', () => {
    const presets = simulationEngine.listMissionPresets();
    expect(presets.length).toBeGreaterThanOrEqual(3);
    const first = simulationEngine.getState().selectedMissionPresetId;
    simulationEngine.loadNextMissionPreset();
    const second = simulationEngine.getState().selectedMissionPresetId;
    expect(second).not.toBe(first);
  });

  it('can switch mission preset while running and continue in running state', async () => {
    simulationEngine.setTickHz(20);
    simulationEngine.start();
    await new Promise(resolve => setTimeout(resolve, 250));

    const before = simulationEngine.getState().selectedMissionPresetId;
    simulationEngine.loadNextMissionPreset();
    const after = simulationEngine.getState().selectedMissionPresetId;
    expect(after).not.toBe(before);
    expect(simulationEngine.getState().run).toBe(SimRunState.Running);

    await new Promise(resolve => setTimeout(resolve, 250));
    const frame = telemetryBus.getLast();
    expect(frame).toBeDefined();
    simulationEngine.stop();
  });

  it('publishes link and GPS simulation values on frames', async () => {
    simulationEngine.setTickHz(25);
    simulationEngine.start();
    await new Promise(resolve => setTimeout(resolve, 300));
    simulationEngine.stop();

    const frame = telemetryBus.getLast();
    expect(frame).toBeDefined();
    expect(frame?.link.quality).toBeGreaterThanOrEqual(0);
    expect(frame?.link.quality).toBeLessThanOrEqual(1);
    expect(frame?.gps.satellites).toBeGreaterThanOrEqual(6);
    expect(frame?.gps.fix).not.toBeUndefined();
    expect(Object.values(GpsFix)).toContain(frame?.gps.fix as GpsFix);
  });

  it(
    'drives watchdog through stale/lost when link outage is forced',
    async () => {
      try {
        telemetryWatchdog.start();
        simulationEngine.setTickHz(20);
        simulationEngine.start();
        await new Promise(resolve => setTimeout(resolve, 500));
        expect(useTelemetryStore.getState().connection).toBe(ConnectionState.Sim);

        simulationEngine.setForceLinkOutage(true);
        const degradedReached = await waitFor(() => {
          const state = useTelemetryStore.getState().connection;
          return state === ConnectionState.Stale || state === ConnectionState.Lost;
        }, 7000);
        expect(degradedReached).toBe(true);

        simulationEngine.setForceLinkOutage(false);
        const recovered = await waitFor(
          () => useTelemetryStore.getState().connection === ConnectionState.Sim,
          3000,
        );
        expect(recovered).toBe(true);
      } finally {
        simulationEngine.setForceLinkOutage(false);
        simulationEngine.stop();
        telemetryWatchdog.stop();
      }
    },
    15000,
  );
});
