import {
  ConnectionState,
  FlightMode,
  GpsFix,
  TelemetrySourceKind,
} from '../src/core/types/telemetry';
import {computeTelemetryDiagnostics} from '../src/features/telemetry-terminal/diagnostics/telemetryDiagnostics';

const emptyFrame = undefined;

describe('telemetryDiagnostics', () => {
  it('returns empty when idle', () => {
    const alerts = computeTelemetryDiagnostics({
      connection: ConnectionState.Idle,
      frame: emptyFrame,
      framesReceived: 0,
      lastFrameAgeMs: 999_999,
      staleThresholdMs: 1500,
      lostThresholdMs: 5000,
    });
    expect(alerts).toHaveLength(0);
  });

  it('flags stale link', () => {
    const alerts = computeTelemetryDiagnostics({
      connection: ConnectionState.Stale,
      frame: emptyFrame,
      framesReceived: 10,
      lastFrameAgeMs: 2000,
      staleThresholdMs: 1500,
      lostThresholdMs: 5000,
    });
    expect(alerts.some(a => a.code === 'LINK_STALE')).toBe(true);
  });

  it('flags low battery', () => {
    const alerts = computeTelemetryDiagnostics({
      connection: ConnectionState.Sim,
      frame: {
        t: Date.now(),
        source: TelemetrySourceKind.Simulation,
        position: {lat: 0, lon: 0, altMsl: 0, altRel: 0},
        velocity: {vEast: 0, vNorth: 0, vUp: 0},
        headingDeg: 0,
        groundSpeed: 0,
        climbSpeed: 0,
        attitude: {roll: 0, pitch: 0, yaw: 0},
        battery: {soc: 0.1, voltage: 12, currentAmps: 0},
        gps: {fix: GpsFix.ThreeD, satellites: 8, hdop: 1},
        link: {quality: 1, latencyMs: 20, dropRate: 0},
        system: {mode: FlightMode.Manual, armed: false},
      },
      framesReceived: 1,
      lastFrameAgeMs: 50,
      staleThresholdMs: 1500,
      lostThresholdMs: 5000,
    });
    expect(alerts.some(a => a.code === 'BATTERY_LOW')).toBe(true);
  });
});
