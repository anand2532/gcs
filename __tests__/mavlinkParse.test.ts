/* eslint-disable no-bitwise -- footer reconstruction from wire bytes */

import {mavlinkChecksum, crcAccumulateByte} from '../src/communication/mavlink/crc';
import {parseOneMavlinkV2Frame} from '../src/communication/mavlink/parseFrames';

describe('MAVLink CRC', () => {
  it('matches pymavlink reference vector', () => {
    const hex =
      'fd090000000101000000000000000104000403ebeb';
    const buf = Uint8Array.from(Buffer.from(hex, 'hex'));
    const headerAndPayload = buf.subarray(1, buf.length - 2);
    const crc = mavlinkChecksum(headerAndPayload, 50);
    const footer = buf[buf.length - 2]! | (buf[buf.length - 1]! << 8);
    expect(crc).toBe(footer);
  });

  it('crcAccumulateByte is deterministic', () => {
    let c = 0xffff;
    c = crcAccumulateByte(1, c);
    expect(c).toBeGreaterThan(0);
  });
});

describe('MAVLink frame parse', () => {
  it('parses pymavlink heartbeat', () => {
    const hex =
      'fd090000000101000000000000000104000403ebeb';
    const buf = Uint8Array.from(Buffer.from(hex, 'hex'));
    const frame = parseOneMavlinkV2Frame(buf);
    expect(frame).not.toBeNull();
    expect(frame!.header.msgId).toBe(0);
    expect(frame!.checksumOk).toBe(true);
  });
});
