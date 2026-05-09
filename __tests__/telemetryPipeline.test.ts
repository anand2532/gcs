/**
 * Telemetry pipeline contract test.
 *
 * This is the single most important test in Phase 1: it pins the seam
 * between *any* telemetry producer (sim today, MAVLink/MQTT later) and
 * the store/UI. If this test breaks, the architecture has regressed.
 */

import {describe, expect, it, beforeEach} from '@jest/globals';

import {
  ConnectionState,
  type TelemetryFrame,
  TelemetrySourceKind,
  GpsFix,
  FlightMode,
} from '../src/core/types/telemetry';
import {
  bindBusToStore,
  telemetryBus,
  useTelemetryStore,
} from '../src/modules/telemetry';

function makeFrame(
  overrides: Partial<TelemetryFrame> = {},
  source: TelemetrySourceKind = TelemetrySourceKind.Simulation,
): TelemetryFrame {
  return {
    t: Date.now(),
    source,
    position: {lat: 37.0, lon: -122.0, altMsl: 30, altRel: 0},
    velocity: {vEast: 0, vNorth: 0, vUp: 0},
    headingDeg: 0,
    groundSpeed: 0,
    climbSpeed: 0,
    attitude: {roll: 0, pitch: 0, yaw: 0},
    battery: {soc: 1, voltage: 12.6, currentAmps: 0},
    gps: {fix: GpsFix.ThreeD, satellites: 14, hdop: 0.8},
    link: {quality: 1, latencyMs: 30, dropRate: 0},
    system: {mode: FlightMode.Manual, armed: false},
    ...overrides,
  };
}

describe('telemetry pipeline', () => {
  beforeEach(() => {
    useTelemetryStore.getState().reset();
    bindBusToStore();
  });

  it('delivers published frames to subscribers', () => {
    const seen: TelemetryFrame[] = [];
    const unsub = telemetryBus.subscribe(f => {
      seen.push(f);
    });
    const frame = makeFrame({headingDeg: 42});
    telemetryBus.publish(frame);
    unsub();
    expect(seen).toHaveLength(1);
    expect(seen[0]).toBeDefined();
    expect(seen[0]!.headingDeg).toBe(42);
  });

  it('hydrates late subscribers with the most recent frame', () => {
    telemetryBus.publish(makeFrame({headingDeg: 90}));
    const seen: TelemetryFrame[] = [];
    const unsub = telemetryBus.subscribe(f => {
      seen.push(f);
    });
    unsub();
    expect(seen).toHaveLength(1);
    expect(seen[0]!.headingDeg).toBe(90);
  });

  it('updates the store and tags the connection by source kind', () => {
    telemetryBus.publish(makeFrame({}, TelemetrySourceKind.Simulation));
    expect(useTelemetryStore.getState().frame).toBeDefined();
    expect(useTelemetryStore.getState().connection).toBe(ConnectionState.Sim);

    telemetryBus.publish(makeFrame({}, TelemetrySourceKind.Mavlink));
    expect(useTelemetryStore.getState().connection).toBe(ConnectionState.Live);

    telemetryBus.publish(makeFrame({}, TelemetrySourceKind.Mqtt));
    expect(useTelemetryStore.getState().connection).toBe(ConnectionState.Live);
  });

  it('counts received frames in the store', () => {
    useTelemetryStore.getState().startSession();
    telemetryBus.publish(makeFrame({headingDeg: 1}));
    telemetryBus.publish(makeFrame({headingDeg: 2}));
    telemetryBus.publish(makeFrame({headingDeg: 3}));
    expect(useTelemetryStore.getState().framesReceived).toBe(3);
  });

  it('preserves the immutability contract of TelemetryFrame', () => {
    const frame = makeFrame();
    // The type system enforces readonly; this asserts the published object
    // is the one received (no defensive cloning) — important because
    // higher-rate sources may publish 50+ times a second.
    let received: TelemetryFrame | undefined;
    const unsub = telemetryBus.subscribe(f => {
      received = f;
    });
    telemetryBus.publish(frame);
    unsub();
    expect(received).toBe(frame);
  });
});
