export interface MavlinkTapEvent {
  readonly msgId: number;
  readonly sysId: number;
  readonly compId: number;
  readonly seq: number;
  readonly checksumOk: boolean;
  readonly payloadPreviewHex?: string;
}

let tapListener: ((e: MavlinkTapEvent) => void) | undefined;

export function setMavlinkTapListener(fn: ((e: MavlinkTapEvent) => void) | undefined): void {
  tapListener = fn;
}

export function tapMavlinkParsed(frame: {
  readonly header: {msgId: number; sysId: number; compId: number; seq: number};
  readonly payload: Uint8Array;
  readonly checksumOk: boolean;
}): void {
  if (!tapListener) {
    return;
  }
  tapListener({
    msgId: frame.header.msgId,
    sysId: frame.header.sysId,
    compId: frame.header.compId,
    seq: frame.header.seq,
    checksumOk: frame.checksumOk,
    payloadPreviewHex: hexPreview(frame.payload, 24),
  });
}

function hexPreview(bytes: Uint8Array, max: number): string {
  const n = Math.min(bytes.length, max);
  let s = '';
  for (let i = 0; i < n; i++) {
    s += bytes[i]!.toString(16).padStart(2, '0');
  }
  if (bytes.length > max) {
    s += '…';
  }
  return s;
}
