import {emitCommandAck} from './commands/commandAckBridge';
import {MavlinkCommandPipeline} from './commands/MavlinkCommandPipeline';
import {tapMavlinkParsed} from './debug/mavlinkTapBridge';
import {decodePayload} from './mavlink/mavlinkDecode';
import {MavlinkIngress} from './mavlink/MavlinkIngress';
import {type ParsedMavlinkFrame} from './mavlink/mavlinkTypes';
import {ReconnectManager} from './reconnect/ReconnectManager';
import {MavlinkTelemetryFusion} from './telemetry/mavlinkTelemetryFusion';
import {UdpTransport} from './transports/UdpTransport';
import {FcHeartbeatMonitor} from './watchdog/FcHeartbeatMonitor';
import {log} from '../core/logger/Logger';
import {
  ConnectionState,
  type TelemetrySource,
  TelemetrySourceKind,
} from '../core/types/telemetry';
import {now} from '../core/utils/time';
import {telemetryBus} from '../modules/telemetry/TelemetryBus';
import {useTelemetryStore} from '../modules/telemetry/TelemetryStore';

/**
 * Live MAVLink telemetry via UDP (e.g. ArduPilot SITL / UDP radio).
 * Publishes decimated {@link TelemetryFrame}s on `telemetryBus`.
 */
export class MavlinkTelemetrySource implements TelemetrySource {
  readonly kind = TelemetrySourceKind.Mavlink;

  private readonly ingress = new MavlinkIngress();
  private readonly fusion = new MavlinkTelemetryFusion();
  private readonly udp = new UdpTransport();

  private running = false;
  private bindPort = 14550;
  private publishHz = 20;
  private publishTimer: ReturnType<typeof setInterval> | null = null;
  private lastRemote: {address: string; port: number} | null = null;

  private pipeline: MavlinkCommandPipeline | null = null;
  private hbMon: FcHeartbeatMonitor | null = null;
  private reconnectMgr: ReconnectManager | null = null;

  configure(opts: {bindPort?: number; publishHz?: number}): void {
    if (opts.bindPort !== undefined) {
      this.bindPort = opts.bindPort;
    }
    if (opts.publishHz !== undefined) {
      this.publishHz = opts.publishHz;
    }
  }

  get commands(): MavlinkCommandPipeline | null {
    return this.pipeline;
  }

  getLastRemoteEndpoint(): {address: string; port: number} | null {
    return this.lastRemote;
  }

  getUdpTransport(): UdpTransport {
    return this.udp;
  }

  start(): void {
    if (this.running) {
      return;
    }
    this.running = true;
    this.startUdp().catch(e => {
      log.communication.error('mavlink.udp.async_failed', {
        error: e instanceof Error ? e.message : String(e),
      });
      this.running = false;
    });
  }

  private async sendPacketInternal(buf: Uint8Array): Promise<void> {
    const r = this.lastRemote;
    if (!r) {
      throw new Error('MAVLink: no UDP peer yet');
    }
    await this.udp.send(buf, r.port, r.address);
  }

  private async startUdp(): Promise<void> {
    try {
      await this.udp.bind(this.bindPort);
      log.communication.info('mavlink.udp.bound', {port: this.bindPort});
      this.afterBind();
    } catch (e) {
      log.communication.error('mavlink.udp.bind_failed', {
        error: e instanceof Error ? e.message : String(e),
      });
      this.running = false;
    }
  }

  private afterBind(): void {
    useTelemetryStore.getState().startSession();
    this.wireUdpIngress();
    this.startPublishLoop();
    this.ensurePipeline();
    this.ensureSupervisors();
  }

  private wireUdpIngress(): void {
    this.udp.setMessageHandler((data, rinfo) => {
      this.lastRemote = {address: rinfo.address, port: rinfo.port};
      const frames = this.ingress.push(data);
      this.processFrames(frames);
      const drops =
        this.ingress.stats.bytesDropped /
        Math.max(1, this.ingress.stats.bytesReceived);
      this.fusion.setDropTelemetry(Math.min(1, drops), 0);
    });
  }

  private startPublishLoop(): void {
    const intervalMs = Math.max(10, Math.floor(1000 / this.publishHz));
    this.publishTimer = setInterval(() => {
      telemetryBus.publish(this.fusion.buildFrame(now()));
    }, intervalMs);
  }

  private ensurePipeline(): void {
    if (this.pipeline) {
      return;
    }
    this.pipeline = new MavlinkCommandPipeline({
      gcsSystemId: 255,
      gcsComponentId: 190,
      sendPacket: b => this.sendPacketInternal(b),
      trace: ev =>
        log.communication.event('command.trace', {
          phase: ev.phase,
          command: ev.command,
          detail: ev.detail,
        }),
    });
  }

  private ensureSupervisors(): void {
    if (!this.reconnectMgr) {
      this.reconnectMgr = new ReconnectManager(() => this.restartUdpLink(), {
        initialBackoffMs: 1500,
        maxBackoffMs: 30_000,
      });
    }
    if (!this.hbMon) {
      this.hbMon = new FcHeartbeatMonitor({
        staleMs: 4000,
        pollMs: 500,
        getAgeMs: () => this.fusion.getLastFcHeartbeatAgeMs(),
        onStale: () => this.reconnectMgr?.schedule('fc_heartbeat'),
        onRecover: () => this.reconnectMgr?.resetBackoff(),
      });
    }
    this.hbMon.start();
  }

  private async restartUdpLink(): Promise<void> {
    if (this.publishTimer) {
      clearInterval(this.publishTimer);
      this.publishTimer = null;
    }
    this.hbMon?.stop();
    this.udp.setMessageHandler(undefined);
    this.udp.close();
    this.ingress.reset();
    await this.udp.bind(this.bindPort);
    log.communication.info('mavlink.udp.rebound', {port: this.bindPort});
    this.afterBind();
  }

  private processFrames(frames: ParsedMavlinkFrame[]): void {
    for (const f of frames) {
      tapMavlinkParsed(f);
      if (!f.checksumOk) {
        continue;
      }
      const decoded = decodePayload(f.header.msgId, f.payload);
      if (!decoded) {
        continue;
      }
      if (decoded.type === 'COMMAND_ACK') {
        emitCommandAck(decoded);
        continue;
      }
      this.fusion.applyDecoded(decoded);
    }
  }

  stop(): void {
    this.hbMon?.stop();
    this.reconnectMgr?.cancel();
    if (this.publishTimer) {
      clearInterval(this.publishTimer);
      this.publishTimer = null;
    }
    this.udp.setMessageHandler(undefined);
    this.udp.close();
    this.ingress.reset();
    this.pipeline = null;
    this.running = false;
    this.lastRemote = null;
    useTelemetryStore.getState().endSession();
    useTelemetryStore.getState().setConnection(ConnectionState.Idle);
    log.communication.info('mavlink.udp.stopped', {});
  }

  isRunning(): boolean {
    return this.running;
  }
}

export const mavlinkTelemetrySource = new MavlinkTelemetrySource();
