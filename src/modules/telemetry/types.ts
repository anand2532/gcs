/**
 * Internal type aliases for the telemetry module. Public types live in
 * `@core/types/telemetry`; this file exists only to keep ergonomic
 * shorthand local to module consumers.
 */
export type {
  TelemetryFrame,
  TelemetrySource,
  TelemetrySourceKind,
  ConnectionState,
  FlightMode,
  GpsFix,
  BatteryState,
  GpsState,
  AttitudeState,
  SystemState,
} from '../../core/types/telemetry';
