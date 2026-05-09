export interface MavlinkFrameHeader {
  readonly payloadLength: number;
  readonly incompatFlags: number;
  readonly compatFlags: number;
  readonly seq: number;
  readonly sysId: number;
  readonly compId: number;
  readonly msgId: number;
}

export interface ParsedMavlinkFrame {
  readonly header: MavlinkFrameHeader;
  readonly payload: Uint8Array;
  readonly checksumOk: boolean;
}
