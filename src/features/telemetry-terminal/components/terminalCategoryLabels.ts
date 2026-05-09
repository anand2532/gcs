import type {TerminalCategory} from '../state/terminalPacketTypes';

/** Short, readable chip labels for filters */
export const CATEGORY_CHIP_LABEL: Record<TerminalCategory, string> = {
  MAVLINK: 'MAVLink',
  SERIAL: 'Serial',
  COMMAND_ACK: 'Cmd ACK',
  COMMAND_OUT: 'Cmd out',
  HEARTBEAT: 'Heartbeat',
  GPS: 'GPS',
  BATTERY: 'Battery',
  MISSION: 'Mission',
  WARN: 'Warn',
  ERROR: 'Error',
  CONNECTION: 'Link',
  APP: 'App',
  SYSTEM: 'System',
  SIM: 'Sim',
};
