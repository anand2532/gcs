/**
 * MAVLink CRC-16/X25 (MCRF4XX) — matches pymavlink `x25crc_slow` / mavlink checksum.h.
 */
/* eslint-disable no-bitwise -- MAVLink wire checksum implementation */

export function crcAccumulateByte(byte: number, crc: number): number {
  let tmp = (byte ^ (crc & 0xff)) & 0xff;
  tmp = (tmp ^ (tmp << 4)) & 0xff;
  crc =
    ((crc >> 8) ^ (tmp << 8) ^ (tmp << 3) ^ (tmp >> 4)) & 0xffff;
  return crc;
}

/** Compute checksum over MAVLink v2 bytes starting after 0xFD through payload, then crc_extra. */
export function mavlinkChecksum(headerAndPayload: Uint8Array, crcExtra: number): number {
  let crc = 0xffff;
  for (let i = 0; i < headerAndPayload.length; i++) {
    crc = crcAccumulateByte(headerAndPayload[i]!, crc);
  }
  crc = crcAccumulateByte(crcExtra, crc);
  return crc & 0xffff;
}
