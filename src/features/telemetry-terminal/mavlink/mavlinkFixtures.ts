/**
 * Synthetic MAVLink-shaped rows for UI / tests until the native bridge lands.
 * Not wire-compatible CRC checks — schema demonstration only.
 */

import {LogLevel} from '../../../core/logger/Logger';

import type {TerminalPacketRecord} from '../state/terminalPacketTypes';

export const MAVLINK_FIXTURE_ROWS: TerminalPacketRecord[] = [
  {
    id: 'fx-mav-1',
    t: Date.now() - 120_000,
    direction: 'INCOMING',
    category: 'MAVLINK',
    severity: LogLevel.Info,
    summary: 'HEARTBEAT sys=1 comp=1 type=QUADROTOR',
    packetType: 'HEARTBEAT',
    sourceSystem: '1',
    targetSystem: '255',
    payload: {msgId: 0, sysId: 1, compId: 1, mavVersion: 3},
    rawHex: 'fd09...',
  },
  {
    id: 'fx-mav-2',
    t: Date.now() - 119_000,
    direction: 'OUTGOING',
    category: 'MAVLINK',
    severity: LogLevel.Info,
    summary: 'COMMAND_LONG arm · param1=1',
    packetType: 'COMMAND_LONG',
    sourceSystem: '255',
    targetSystem: '1',
    payload: {command: 400, target_system: 1, confirmation: 0},
  },
  {
    id: 'fx-mav-3',
    t: Date.now() - 118_500,
    direction: 'INCOMING',
    category: 'COMMAND_ACK',
    severity: LogLevel.Info,
    summary: 'COMMAND_ACK result=ACCEPTED',
    packetType: 'COMMAND_ACK',
    sourceSystem: '1',
    targetSystem: '255',
    payload: {command: 400, result: 0},
  },
];
