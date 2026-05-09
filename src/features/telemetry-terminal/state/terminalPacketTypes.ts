import type {LogLevel, LogPayload} from '../../../core/logger/Logger';

/** Trace of a command for the inspector (outgoing / ack / retry). */
export type TerminalDirection =
  | 'INCOMING'
  | 'OUTGOING'
  | 'INTERNAL'
  | 'ERROR'
  | 'WARNING';

export type TerminalCategory =
  | 'MAVLINK'
  | 'SERIAL'
  | 'COMMAND_ACK'
  | 'COMMAND_OUT'
  | 'HEARTBEAT'
  | 'GPS'
  | 'BATTERY'
  | 'MISSION'
  | 'WARN'
  | 'ERROR'
  | 'CONNECTION'
  | 'APP'
  | 'SYSTEM'
  | 'SIM';

export interface TerminalPacketRecord {
  readonly id: string;
  readonly t: number;
  readonly direction: TerminalDirection;
  readonly category: TerminalCategory;
  readonly severity: LogLevel;
  readonly summary: string;
  readonly packetType?: string;
  readonly sourceSystem?: string;
  readonly targetSystem?: string;
  readonly payload?: LogPayload;
  /** Raw MAVLink bytes when native bridge supplies them (avoid huge blobs in UI). */
  readonly rawHex?: string;
}

export interface SessionExportMeta {
  readonly exportedAt: number;
  readonly appVersion: string;
  readonly transportLabel: string;
  readonly connectionLabel: string;
  readonly rowCount: number;
  readonly timeRange?: {readonly from: number; readonly to: number};
}
