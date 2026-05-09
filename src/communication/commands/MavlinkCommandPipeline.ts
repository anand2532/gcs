import {subscribeCommandAck} from './commandAckBridge';
import {MAV_CMD, MAV_RESULT} from './mavlinkConstants';
import {log} from '../../core/logger/Logger';
import {getMavlinkCrcExtra} from '../mavlink/crcExtra';
import {
  buildCommandLongPayload,
  encodeMavlinkV2Packet,
  type SeqState,
} from '../mavlink/mavlinkEncode';

const COMMAND_LONG_MSG_ID = 76;
const COMMAND_LONG_CRC = getMavlinkCrcExtra(COMMAND_LONG_MSG_ID) ?? 152;

export interface CommandTraceEvent {
  readonly phase: 'SEND' | 'ACK' | 'TIMEOUT' | 'RETRY';
  readonly command: number;
  readonly detail?: string;
}

export type CommandTraceFn = (ev: CommandTraceEvent) => void;

/**
 * Serialized command queue with COMMAND_ACK correlation (single in-flight command).
 */
export class MavlinkCommandPipeline {
  private readonly seqState: SeqState = {n: 0};
  private readonly gcsSysId: number;
  private readonly gcsCompId: number;
  private readonly sendPacket: (packet: Uint8Array) => Promise<void>;
  private readonly trace?: CommandTraceFn;
  private queue: Array<() => Promise<void>> = [];
  private draining = false;

  constructor(opts: {
    readonly gcsSystemId: number;
    readonly gcsComponentId: number;
    readonly sendPacket: (packet: Uint8Array) => Promise<void>;
    readonly trace?: CommandTraceFn;
  }) {
    this.gcsSysId = opts.gcsSystemId;
    this.gcsCompId = opts.gcsComponentId;
    this.sendPacket = opts.sendPacket;
    this.trace = opts.trace;
  }

  async arm(targetSystem: number, targetComponent: number, arm: boolean): Promise<number> {
    return this.enqueueCommandLong({
      command: MAV_CMD.COMPONENT_ARM_DISARM,
      param1: arm ? 1 : 0,
      targetSystem,
      targetComponent,
    });
  }

  async rtl(targetSystem: number, targetComponent: number): Promise<number> {
    return this.enqueueCommandLong({
      command: MAV_CMD.NAV_RETURN_TO_LAUNCH,
      targetSystem,
      targetComponent,
    });
  }

  async takeoff(
    targetSystem: number,
    targetComponent: number,
    altM: number,
  ): Promise<number> {
    return this.enqueueCommandLong({
      command: MAV_CMD.NAV_TAKEOFF,
      param7: altM,
      targetSystem,
      targetComponent,
    });
  }

  async land(targetSystem: number, targetComponent: number): Promise<number> {
    return this.enqueueCommandLong({
      command: MAV_CMD.NAV_LAND,
      targetSystem,
      targetComponent,
    });
  }

  async pauseContinue(
    targetSystem: number,
    targetComponent: number,
    pause: boolean,
  ): Promise<number> {
    return this.enqueueCommandLong({
      command: MAV_CMD.DO_PAUSE_CONTINUE,
      param1: pause ? 0 : 1,
      targetSystem,
      targetComponent,
    });
  }

  async requestAutopilotCapabilities(
    targetSystem: number,
    targetComponent: number,
  ): Promise<number> {
    return this.enqueueCommandLong({
      command: MAV_CMD.REQUEST_AUTOPILOT_CAPABILITIES,
      targetSystem,
      targetComponent,
    });
  }

  private async enqueueCommandLong(args: {
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
  }): Promise<number> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await this.sendCommandLongOnce(args, 3, 2500);
          resolve(result);
        } catch (e) {
          reject(e instanceof Error ? e : new Error(String(e)));
        }
      });
      this.drainQueue().catch(() => {
        /* drain handles errors internally */
      });
    });
  }

  private async drainQueue(): Promise<void> {
    if (this.draining) {
      return;
    }
    this.draining = true;
    while (this.queue.length > 0) {
      const job = this.queue.shift();
      if (job) {
        await job();
      }
    }
    this.draining = false;
  }

  private async sendCommandLongOnce(
    args: {
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
    },
    retriesLeft: number,
    timeoutMs: number,
  ): Promise<number> {
    const payload = buildCommandLongPayload({
      command: args.command,
      param1: args.param1,
      param2: args.param2,
      param3: args.param3,
      param4: args.param4,
      param5: args.param5,
      param6: args.param6,
      param7: args.param7,
      targetSystem: args.targetSystem,
      targetComponent: args.targetComponent,
      confirmation: 0,
    });
    const packet = encodeMavlinkV2Packet(
      this.seqState,
      this.gcsSysId,
      this.gcsCompId,
      COMMAND_LONG_MSG_ID,
      COMMAND_LONG_CRC,
      payload,
    );
    this.trace?.({phase: 'SEND', command: args.command});
    await this.sendPacket(packet);

    try {
      const result = await this.waitForAck(args.command, timeoutMs);
      this.trace?.({phase: 'ACK', command: args.command, detail: String(result)});
      return result;
    } catch (e) {
      if (retriesLeft <= 0) {
        this.trace?.({
          phase: 'TIMEOUT',
          command: args.command,
          detail: e instanceof Error ? e.message : String(e),
        });
        throw e;
      }
      this.trace?.({phase: 'RETRY', command: args.command});
      log.communication.warn('command.retry', {
        command: args.command,
        retriesLeft,
      });
      return this.sendCommandLongOnce(args, retriesLeft - 1, timeoutMs);
    }
  }

  private waitForAck(expectedCommand: number, timeoutMs: number): Promise<number> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        unsub();
        reject(new Error(`COMMAND_ACK timeout cmd=${expectedCommand}`));
      }, timeoutMs);
      const unsub = subscribeCommandAck(ack => {
        if (ack.command !== expectedCommand) {
          return;
        }
        clearTimeout(timer);
        unsub();
        resolve(ack.result);
      });
    });
  }
}

/** Interpret MAV_RESULT for logging / UX. */
export function isAckSuccess(result: number): boolean {
  return (
    result === MAV_RESULT.ACCEPTED ||
    result === MAV_RESULT.IN_PROGRESS
  );
}
