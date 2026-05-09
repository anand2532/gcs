import {LogLevel, type LogRecord} from '../../../core/logger/Logger';

import type {
  TerminalCategory,
  TerminalDirection,
  TerminalPacketRecord,
} from '../state/terminalPacketTypes';

function inferCategory(record: LogRecord): TerminalCategory {
  if (record.level === LogLevel.Error) {
    return 'ERROR';
  }
  if (record.level === LogLevel.Warn) {
    return 'WARN';
  }
  const c = record.category.toLowerCase();
  if (c.includes('mavlink') || c.includes('mav')) {
    return 'MAVLINK';
  }
  if (c.includes('serial')) {
    return 'SERIAL';
  }
  if (c.includes('watchdog') || c.includes('link')) {
    return 'CONNECTION';
  }
  if (c.includes('telemetry')) {
    return 'SIM';
  }
  if (c.includes('map')) {
    return 'SYSTEM';
  }
  if (c.includes('sim')) {
    return 'SIM';
  }
  if (c.includes('mission')) {
    return 'MISSION';
  }
  return 'APP';
}

function inferDirection(
  record: LogRecord,
  category: TerminalCategory,
): TerminalDirection {
  if (
    record.level === LogLevel.Error ||
    category === 'ERROR' ||
    record.message.toLowerCase().includes('error')
  ) {
    return 'ERROR';
  }
  if (record.level === LogLevel.Warn) {
    return 'WARNING';
  }
  if (
    category === 'MAVLINK' &&
    (record.message.includes('←') ||
      record.message.toLowerCase().includes('inbound'))
  ) {
    return 'INCOMING';
  }
  if (
    category === 'MAVLINK' &&
    (record.message.includes('→') ||
      record.message.toLowerCase().includes('outbound'))
  ) {
    return 'OUTGOING';
  }
  return 'INTERNAL';
}

export function mapLogRecordToTerminal(
  record: LogRecord,
  id: string,
): TerminalPacketRecord {
  const category = inferCategory(record);
  const direction = inferDirection(record, category);
  const payload = record.payload as Record<string, unknown> | undefined;
  const packetType =
    typeof payload?.msgId === 'string'
      ? payload.msgId
      : typeof payload?.message === 'string'
        ? payload.message
        : undefined;

  return {
    id,
    t: record.t,
    direction,
    category,
    severity: record.level,
    summary: record.message,
    packetType,
    sourceSystem:
      typeof payload?.sysId === 'number'
        ? String(payload.sysId)
        : typeof payload?.source === 'string'
          ? payload.source
          : undefined,
    targetSystem:
      typeof payload?.targetSys === 'number'
        ? String(payload.targetSys)
        : undefined,
    payload: record.payload,
  };
}
