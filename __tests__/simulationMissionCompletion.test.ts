/**
 * Mission completion: short custom mission keeps CI fast while proving the
 * FSM reaches Completed under real wall-clock + setTimeout latency paths.
 */

import {describe, expect, it, beforeEach, jest} from '@jest/globals';

import {type Mission, WaypointKind} from '../src/core/types/mission';
import {SimRunState, simulationEngine} from '../src/modules/simulation';
import {
  bindBusToStore,
  telemetryWatchdog,
  useTelemetryStore,
} from '../src/modules/telemetry';

const QUICK_HOME: Mission['home'] = {
  lat: 28.6129,
  lon: 77.2295,
  altMsl: 216,
  altRel: 0,
};

const QUICK_MISSION: Mission = {
  id: 'test.quick_complete',
  name: 'Quick complete',
  home: QUICK_HOME,
  defaultCruiseSpeed: 40,
  waypoints: [
    {
      id: 'to',
      kind: WaypointKind.Takeoff,
      position: {
        lat: QUICK_HOME.lat,
        lon: QUICK_HOME.lon,
        altMsl: QUICK_HOME.altMsl + 40,
        altRel: 40,
      },
      acceptanceRadius: 20,
    },
    {
      id: 'land',
      kind: WaypointKind.Land,
      position: {
        lat: QUICK_HOME.lat,
        lon: QUICK_HOME.lon,
        altMsl: QUICK_HOME.altMsl,
        altRel: 0,
      },
      acceptanceRadius: 20,
    },
  ],
};

describe('mission completion (integration)', () => {
  beforeEach(() => {
    jest.useRealTimers();
    telemetryWatchdog.stop();
    simulationEngine.setForceLinkOutage(false);
    simulationEngine.stop();
    useTelemetryStore.getState().reset();
    bindBusToStore();
  });

  it(
    'custom short mission reaches Completed',
    async () => {
      simulationEngine.setTickHz(60);
      simulationEngine.loadMission(QUICK_MISSION);
      simulationEngine.start();
      expect(simulationEngine.getState().run).toBe(SimRunState.Running);

      const deadline = Date.now() + 120_000;
      await new Promise<void>((resolve, reject) => {
        const poll = setInterval(() => {
          if (simulationEngine.getState().run === SimRunState.Completed) {
            clearInterval(poll);
            resolve();
            return;
          }
          if (Date.now() >= deadline) {
            clearInterval(poll);
            reject(
              new Error(
                `still ${simulationEngine.getState().run} after 120s — mission did not complete`,
              ),
            );
          }
        }, 200);
      });

      expect(simulationEngine.isRunning()).toBe(false);
      simulationEngine.stop();
    },
    130_000,
  );

  it(
    'reaches Completed when synthetic link outage drops every in-flight frame',
    async () => {
      simulationEngine.setForceLinkOutage(true);
      simulationEngine.setTickHz(30);
      simulationEngine.loadMission(QUICK_MISSION);
      simulationEngine.start();

      const deadline = Date.now() + 120_000;
      await new Promise<void>((resolve, reject) => {
        const poll = setInterval(() => {
          if (simulationEngine.getState().run === SimRunState.Completed) {
            clearInterval(poll);
            resolve();
            return;
          }
          if (Date.now() >= deadline) {
            clearInterval(poll);
            reject(
              new Error(
                `still ${simulationEngine.getState().run} with full frame loss — state machine or engine stuck`,
              ),
            );
          }
        }, 200);
      });

      expect(simulationEngine.isRunning()).toBe(false);
      simulationEngine.setForceLinkOutage(false);
      simulationEngine.stop();
    },
    130_000,
  );
});
