import {type LogLevel} from '../../../core/logger/Logger';

import type {
  TerminalCategory,
  TerminalPacketRecord,
} from '../state/terminalPacketTypes';

export interface TerminalFilterState {
  readonly query: string;
  readonly minLevel: LogLevel | 'all';
  /** Categories suppressed from the stream (empty = none hidden). */
  readonly disabledCategories: ReadonlySet<TerminalCategory>;
}

const LEVEL_ORDER: Record<LogLevel, number> = {
  trace: 0,
  debug: 1,
  info: 2,
  warn: 3,
  error: 4,
};

export function passesTerminalFilters(
  row: TerminalPacketRecord,
  f: TerminalFilterState,
): boolean {
  if (f.disabledCategories.has(row.category)) {
    return false;
  }

  if (f.minLevel !== 'all') {
    if (LEVEL_ORDER[row.severity] < LEVEL_ORDER[f.minLevel]) {
      return false;
    }
  }

  if (f.query.trim()) {
    const q = f.query.trim().toLowerCase();
    const hay = [
      row.summary,
      row.packetType ?? '',
      row.category,
      row.direction,
      row.sourceSystem ?? '',
      row.targetSystem ?? '',
      JSON.stringify(row.payload ?? {}),
    ]
      .join(' ')
      .toLowerCase();
    if (!hay.includes(q)) {
      return false;
    }
  }

  return true;
}

export const ALL_TERMINAL_CATEGORIES: TerminalCategory[] = [
  'MAVLINK',
  'SERIAL',
  'COMMAND_ACK',
  'COMMAND_OUT',
  'HEARTBEAT',
  'GPS',
  'BATTERY',
  'MISSION',
  'WARN',
  'ERROR',
  'CONNECTION',
  'APP',
  'SYSTEM',
  'SIM',
];
