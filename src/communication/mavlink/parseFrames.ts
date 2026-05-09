/* eslint-disable no-bitwise -- MAVLink LE msg id unpacking */

import {mavlinkChecksum} from './crc';
import {getMavlinkCrcExtra} from './crcExtra';
import {type ParsedMavlinkFrame} from './mavlinkTypes';

function readMsgIdLe24(b: Uint8Array, off: number): number {
  return b[off]! | (b[off + 1]! << 8) | (b[off + 2]! << 16);
}

export function parseOneMavlinkV2Frame(packet: Uint8Array): ParsedMavlinkFrame | null {
  if (packet.length < 12 || packet[0] !== 0xfd) {
    return null;
  }
  const payloadLen = packet[1]!;
  const incompatFlags = packet[2]!;
  if (incompatFlags !== 0) {
    return null;
  }
  const total = 1 + 9 + payloadLen + 2;
  if (packet.length < total) {
    return null;
  }
  const msgId = readMsgIdLe24(packet, 7);
  const crcExtra = getMavlinkCrcExtra(msgId);
  const headerAndPayload = packet.subarray(1, 1 + 9 + payloadLen);
  const crcLow = packet[1 + 9 + payloadLen]!;
  const crcHigh = packet[1 + 9 + payloadLen + 1]!;
  const actualCrc = crcLow | (crcHigh << 8);
  let checksumOk = false;
  if (crcExtra !== undefined) {
    const expected = mavlinkChecksum(headerAndPayload, crcExtra);
    checksumOk = expected === actualCrc;
  } else {
    /** Unknown msg id — cannot compute MAVLink CRC_EXTRA; still surface packet for debugging. */
    checksumOk = true;
  }

  const payload = packet.subarray(10, 10 + payloadLen);
  const header = {
    payloadLength: payloadLen,
    incompatFlags,
    compatFlags: packet[3]!,
    seq: packet[4]!,
    sysId: packet[5]!,
    compId: packet[6]!,
    msgId,
  };

  return {header, payload, checksumOk};
}

export function extractMavlinkV2Frames(buffer: Uint8Array): {
  readonly frames: ParsedMavlinkFrame[];
  readonly rest: Uint8Array;
} {
  const frames: ParsedMavlinkFrame[] = [];
  let i = 0;
  while (i < buffer.length) {
    if (buffer[i] !== 0xfd) {
      i++;
      continue;
    }
    const remaining = buffer.length - i;
    if (remaining < 12) {
      break;
    }
    const payloadLen = buffer[i + 1]!;
    const incompatFlags = buffer[i + 2]!;
    if (incompatFlags !== 0) {
      i++;
      continue;
    }
    const total = 1 + 9 + payloadLen + 2;
    if (remaining < total) {
      break;
    }
    const slice = buffer.subarray(i, i + total);
    const parsed = parseOneMavlinkV2Frame(slice);
    if (parsed) {
      frames.push(parsed);
    }
    i += total;
  }
  const rest = buffer.subarray(i);
  return {frames, rest};
}
