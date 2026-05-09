/**
 * Canonical telemetry types.
 *
 * Architectural commitment: every telemetry producer (simulation, MAVLink,
 * MQTT) publishes `TelemetryFrame`s on the bus. UI consumers never know
 * which source produced the frame. This is the seam that prevents
 * Phase-2/3/4 rewrites.
 */

import {type GeoPosition, type HeadingDeg, type VelocityEnu} from './geo';

/** GPS fix quality, modeled after MAVLink GPS_FIX_TYPE for forward compat. */
export const GpsFix = {
  None: 'NONE',
  TwoD: 'FIX_2D',
  ThreeD: 'FIX_3D',
  Dgps: 'DGPS',
  Rtk: 'RTK',
} as const;
export type GpsFix = (typeof GpsFix)[keyof typeof GpsFix];

/** Coarse system mode. Will be widened when MAVLink mappings land. */
export const FlightMode = {
  Manual: 'MANUAL',
  Stabilize: 'STABILIZE',
  Auto: 'AUTO',
  Loiter: 'LOITER',
  Rtl: 'RTL',
  Land: 'LAND',
  Guided: 'GUIDED',
  Unknown: 'UNKNOWN',
} as const;
export type FlightMode = (typeof FlightMode)[keyof typeof FlightMode];

/** Telemetry link / connection FSM state, used by HUD pill. */
export const ConnectionState = {
  /** No source attached. */
  Idle: 'IDLE',
  /** Source is attached but no frames yet. */
  Connecting: 'CONNECTING',
  /** Frames flowing (real link). */
  Live: 'LIVE',
  /** Frames flowing from the local simulator. */
  Sim: 'SIM',
  /** Source attached but frames are older than the freshness threshold. */
  Stale: 'STALE',
  /** Frames have not arrived for the lost threshold. */
  Lost: 'LOST',
} as const;
export type ConnectionState =
  (typeof ConnectionState)[keyof typeof ConnectionState];

/** Source kind identifies how a frame was produced. */
export const TelemetrySourceKind = {
  Simulation: 'SIMULATION',
  Mavlink: 'MAVLINK',
  Mqtt: 'MQTT',
} as const;
export type TelemetrySourceKind =
  (typeof TelemetrySourceKind)[keyof typeof TelemetrySourceKind];

export interface BatteryState {
  /** State of charge, 0..1. */
  readonly soc: number;
  readonly voltage: number;
  readonly currentAmps: number;
}

export interface GpsState {
  readonly fix: GpsFix;
  readonly satellites: number;
  /** Horizontal dilution of precision; lower is better. */
  readonly hdop: number;
}

export interface AttitudeState {
  /** Radians. */
  readonly roll: number;
  /** Radians. */
  readonly pitch: number;
  /** Radians. Use `headingDeg` for display. */
  readonly yaw: number;
}

export interface SystemState {
  readonly mode: FlightMode;
  readonly armed: boolean;
}

/** Optional mission progress when MAVLink NAV_CONTROLLER_OUTPUT / MISSION_CURRENT available. */
export interface TelemetryMissionSnapshot {
  readonly seq: number;
  readonly total: number;
  readonly distToWpM?: number;
}

/** RC / uplink quality hints when MAVLink RC_CHANNELS / RADIO_STATUS available. */
export interface RcLinkStatus {
  readonly valid: boolean;
  readonly rssiDbm?: number;
}

export interface LinkState {
  /** 0..1 quality score after synthetic loss/jitter modeling. */
  readonly quality: number;
  /** Simulated one-way latency in milliseconds. */
  readonly latencyMs: number;
  /** Recent packet drop ratio estimate (0..1). */
  readonly dropRate: number;
}

/**
 * Single immutable telemetry sample. UI consumers select fields they need.
 *
 * Frames are produced at the source's natural rate (sim: 5–10 Hz; MAVLink:
 * varies per message; MQTT: variable). Consumers must not assume cadence.
 */
export interface TelemetryFrame {
  /** Monotonic-ish source timestamp, ms since epoch. */
  readonly t: number;
  readonly source: TelemetrySourceKind;
  readonly position: GeoPosition;
  readonly velocity: VelocityEnu;
  /** Heading derived from yaw or GPS course-over-ground. */
  readonly headingDeg: HeadingDeg;
  /** Ground speed magnitude, m/s. */
  readonly groundSpeed: number;
  /** Vertical speed, m/s, positive = up. */
  readonly climbSpeed: number;
  readonly attitude: AttitudeState;
  readonly battery: BatteryState;
  readonly gps: GpsState;
  readonly link: LinkState;
  readonly system: SystemState;
  /** Present when link publishes mission progress (MAVLink etc.). */
  readonly missionProgress?: TelemetryMissionSnapshot;
  /** Present when RC radio telemetry is available. */
  readonly rc?: RcLinkStatus;
}

/**
 * Contract every telemetry producer implements. The bus owns wiring; this
 * interface owns lifecycle.
 *
 * Implementations MUST be safe to `start` / `stop` repeatedly and MUST emit
 * exactly one frame at a time, in chronological order, on a single bus.
 */
export interface TelemetrySource {
  readonly kind: TelemetrySourceKind;
  start(): void;
  stop(): void;
  isRunning(): boolean;
}
