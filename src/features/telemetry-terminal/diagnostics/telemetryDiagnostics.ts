import {
  ConnectionState,
  type TelemetryFrame,
} from '../../../core/types/telemetry';

export type DiagnosticSeverity = 'info' | 'warn' | 'critical';

export interface DiagnosticAlert {
  readonly id: string;
  readonly code: string;
  readonly severity: DiagnosticSeverity;
  readonly message: string;
  readonly sinceMs?: number;
}

interface DiagnosticsInput {
  readonly connection: ConnectionState;
  readonly frame: TelemetryFrame | undefined;
  readonly framesReceived: number;
  readonly lastFrameAgeMs: number;
  readonly staleThresholdMs: number;
  readonly lostThresholdMs: number;
}

/**
 * V1 rules: connection staleness / loss driven by existing watchdog semantics.
 */
export function computeTelemetryDiagnostics(
  input: DiagnosticsInput,
): DiagnosticAlert[] {
  const out: DiagnosticAlert[] = [];
  const {connection, lastFrameAgeMs, staleThresholdMs, lostThresholdMs} =
    input;

  if (connection === ConnectionState.Idle) {
    return [];
  }

  if (
    connection === ConnectionState.Stale ||
    (lastFrameAgeMs > staleThresholdMs &&
      connection !== ConnectionState.Connecting)
  ) {
    out.push({
      id: 'link-stale',
      code: 'LINK_STALE',
      severity: 'warn',
      message: `Telemetry stale (${Math.round(lastFrameAgeMs)} ms since frame)`,
      sinceMs: lastFrameAgeMs,
    });
  }

  if (connection === ConnectionState.Lost || lastFrameAgeMs > lostThresholdMs) {
    out.push({
      id: 'link-lost',
      code: 'LINK_LOST',
      severity: 'critical',
      message: `Link lost or no frames (${Math.round(lastFrameAgeMs)} ms)`,
      sinceMs: lastFrameAgeMs,
    });
  }

  if (connection === ConnectionState.Connecting) {
    out.push({
      id: 'link-connecting',
      code: 'LINK_CONNECTING',
      severity: 'info',
      message: 'Connecting — waiting for first frame',
    });
  }

  const soc = input.frame?.battery.soc;
  if (soc !== undefined && soc < 0.15) {
    out.push({
      id: 'bat-low',
      code: 'BATTERY_LOW',
      severity: 'critical',
      message: `Battery critical (${Math.round(soc * 100)}%)`,
    });
  } else if (soc !== undefined && soc < 0.25) {
    out.push({
      id: 'bat-warn',
      code: 'BATTERY_LOW_WARN',
      severity: 'warn',
      message: `Battery low (${Math.round(soc * 100)}%)`,
    });
  }

  return out;
}
