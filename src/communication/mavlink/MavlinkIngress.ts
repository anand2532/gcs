import {type ParsedMavlinkFrame} from './mavlinkTypes';
import {extractMavlinkV2Frames} from './parseFrames';

/** Bounded rolling buffer for MAVLink bytes with overflow accounting. */
export class MavlinkIngress {
  private scratch = new Uint8Array(0);
  private readonly maxBytes: number;
  readonly stats = {
    bytesReceived: 0,
    bytesDropped: 0,
    framesParsed: 0,
    parseErrors: 0,
  };

  constructor(maxBytes: number = 512 * 1024) {
    this.maxBytes = maxBytes;
  }

  push(chunk: Uint8Array): ParsedMavlinkFrame[] {
    this.stats.bytesReceived += chunk.length;
    this.scratch = concat(this.scratch, chunk);
    if (this.scratch.length > this.maxBytes) {
      const overflow = this.scratch.length - this.maxBytes;
      this.scratch = this.scratch.subarray(overflow);
      this.stats.bytesDropped += overflow;
    }
    const {frames, rest} = extractMavlinkV2Frames(this.scratch);
    this.scratch = copyBuf(rest);
    this.stats.framesParsed += frames.length;
    return frames;
  }

  reset(): void {
    this.scratch = new Uint8Array(0);
    this.stats.bytesReceived = 0;
    this.stats.bytesDropped = 0;
    this.stats.framesParsed = 0;
    this.stats.parseErrors = 0;
  }
}

function concat(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}

function copyBuf(b: Uint8Array): Uint8Array {
  const out = new Uint8Array(b.length);
  out.set(b);
  return out;
}
