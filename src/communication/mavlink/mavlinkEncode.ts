/* eslint-disable no-bitwise -- MAVLink packet assembly */

import {mavlinkChecksum} from './crc';

export interface SeqState {
  n: number;
}

export function encodeMavlinkV2Packet(
  seqState: SeqState,
  sysId: number,
  compId: number,
  msgId: number,
  crcExtra: number,
  payload: Uint8Array,
): Uint8Array {
  const seq = seqState.n & 0xff;
  seqState.n = (seqState.n + 1) & 0xffff;
  const payloadLen = payload.length;
  const packet = new Uint8Array(1 + 9 + payloadLen + 2);
  packet[0] = 0xfd;
  packet[1] = payloadLen;
  packet[2] = 0;
  packet[3] = 0;
  packet[4] = seq;
  packet[5] = sysId;
  packet[6] = compId;
  packet[7] = msgId & 0xff;
  packet[8] = (msgId >> 8) & 0xff;
  packet[9] = (msgId >> 16) & 0xff;
  packet.set(payload, 10);
  const crc = mavlinkChecksum(packet.subarray(1, 10 + payloadLen), crcExtra);
  packet[10 + payloadLen] = crc & 0xff;
  packet[10 + payloadLen + 1] = (crc >> 8) & 0xff;
  return packet;
}

/** MAVLink COMMAND_LONG payload (33 bytes). */
export function buildCommandLongPayload(params: {
  readonly command: number;
  readonly param1?: number;
  readonly param2?: number;
  readonly param3?: number;
  readonly param4?: number;
  readonly param5?: number;
  readonly param6?: number;
  readonly param7?: number;
  readonly targetSystem: number;
  readonly targetComponent: number;
  readonly confirmation?: number;
}): Uint8Array {
  const b = new ArrayBuffer(33);
  const v = new DataView(b);
  let o = 0;
  v.setUint16(o, params.command, true);
  o += 2;
  v.setFloat32(o, params.param1 ?? 0, true);
  o += 4;
  v.setFloat32(o, params.param2 ?? 0, true);
  o += 4;
  v.setFloat32(o, params.param3 ?? 0, true);
  o += 4;
  v.setFloat32(o, params.param4 ?? 0, true);
  o += 4;
  v.setFloat32(o, params.param5 ?? 0, true);
  o += 4;
  v.setFloat32(o, params.param6 ?? 0, true);
  o += 4;
  v.setFloat32(o, params.param7 ?? 0, true);
  o += 4;
  v.setUint8(o, params.targetSystem);
  o += 1;
  v.setUint8(o, params.targetComponent);
  o += 1;
  v.setUint8(o, params.confirmation ?? 0);
  return new Uint8Array(b);
}
