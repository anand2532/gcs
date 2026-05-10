import {
  FlightMode,
  GpsFix,
  type RcLinkStatus,
  type TelemetryFrame,
  TelemetrySourceKind,
  type TelemetryMissionSnapshot,
} from '../../core/types/telemetry';
import {PRIMARY_TELEMETRY_VEHICLE_ID} from '../../modules/organization/fleetConstants';
import {
  MAV_MODE_FLAG_SAFETY_ARMED,
  type DecodedMavlinkPayload,
} from '../mavlink/mavlinkDecode';

function yawRadToHeadingDeg(yawRad: number): number {
  const deg = (yawRad * 180) / Math.PI;
  const n = ((deg % 360) + 360) % 360;
  return n;
}

/** Map ArduCopter `custom_mode` (subset) — unknown values fall through to Unknown. */
function mapApmCopterCustomMode(customMode: number): FlightMode {
  switch (customMode) {
    case 0:
      return FlightMode.Stabilize;
    case 1:
      return FlightMode.Manual;
    case 2:
      return FlightMode.Loiter;
    case 3:
      return FlightMode.Auto;
    case 4:
      return FlightMode.Guided;
    case 5:
      return FlightMode.Loiter;
    case 6:
      return FlightMode.Rtl;
    case 9:
      return FlightMode.Land;
    default:
      return FlightMode.Unknown;
  }
}

export class MavlinkTelemetryFusion {
  private lastFcHeartbeatAt = 0;

  private lat = 0;
  private lon = 0;
  private altMsl = 0;
  private altRel = 0;
  private vx = 0;
  private vy = 0;
  private vz = 0;
  private roll = 0;
  private pitch = 0;
  private yaw = 0;
  private headingDeg = 0;
  private groundSpeed = 0;
  private climb = 0;
  private voltage = 12.6;
  private current = 0;
  private batterySoc = 1;
  private gpsFix: GpsFix = GpsFix.None;
  private sats = 0;
  private hdop = 99;
  private mode: FlightMode = FlightMode.Unknown;
  private armed = false;
  private linkQuality = 0.5;
  private latencyMs = 0;
  private dropRate = 0;
  private missionSeq = 0;
  private missionTotal = 0;
  private wpDistM = 0;
  private rc: RcLinkStatus | undefined;

  applyDecoded(msg: DecodedMavlinkPayload): void {
    switch (msg.type) {
      case 'HEARTBEAT':
        this.lastFcHeartbeatAt = Date.now();
        /* eslint-disable-next-line no-bitwise -- MAVLink base_mode flags */
        this.armed = (msg.baseMode & MAV_MODE_FLAG_SAFETY_ARMED) !== 0;
        this.mode = mapApmCopterCustomMode(msg.customMode);
        break;
      case 'GLOBAL_POSITION_INT':
        this.lat = msg.latDeg;
        this.lon = msg.lonDeg;
        this.altMsl = msg.altMslM;
        this.altRel = msg.altRelM;
        this.vx = msg.vxMs;
        this.vy = msg.vyMs;
        this.vz = msg.vzMs;
        this.groundSpeed = Math.hypot(msg.vxMs, msg.vyMs);
        if (msg.hdgDeg !== undefined) {
          this.headingDeg = msg.hdgDeg;
        }
        break;
      case 'ATTITUDE':
        this.roll = msg.rollRad;
        this.pitch = msg.pitchRad;
        this.yaw = msg.yawRad;
        this.headingDeg = yawRadToHeadingDeg(msg.yawRad);
        break;
      case 'SYS_STATUS':
        this.voltage = msg.voltageV;
        this.current = msg.currentA;
        if (msg.batteryPct !== undefined && msg.batteryPct <= 100) {
          this.batterySoc = Math.max(0, Math.min(1, msg.batteryPct / 100));
        }
        break;
      case 'GPS_RAW_INT':
        this.sats = msg.satellites;
        this.hdop = msg.ephM ?? 99;
        this.gpsFix = mapGpsFix(msg.fixType);
        break;
      case 'VFR_HUD':
        this.groundSpeed = msg.groundspeedMs;
        this.climb = msg.climbMs;
        if (msg.headingDeg >= 0) {
          this.headingDeg = msg.headingDeg;
        }
        break;
      case 'MISSION_CURRENT':
        this.missionSeq = msg.seq;
        break;
      case 'MISSION_COUNT':
        this.missionTotal = msg.count;
        break;
      case 'NAV_CONTROLLER_OUTPUT':
        this.wpDistM = msg.wpDistM;
        break;
      case 'RC_CHANNELS':
        this.rc = {
          valid: msg.rssiU8 !== undefined,
          rssiDbm: msg.rssiU8 !== undefined ? -msg.rssiU8 : undefined,
        };
        break;
      case 'RADIO_STATUS':
        if (msg.rssi !== undefined) {
          this.linkQuality = Math.max(0, Math.min(1, msg.rssi / 255));
        }
        break;
      case 'COMMAND_ACK':
      default:
        break;
    }
  }

  setMissionTotal(n: number): void {
    this.missionTotal = n;
  }

  setDropTelemetry(dropRate: number, latencyMs: number): void {
    this.dropRate = dropRate;
    this.latencyMs = latencyMs;
  }

  getLastFcHeartbeatAgeMs(): number | undefined {
    if (this.lastFcHeartbeatAt <= 0) {
      return undefined;
    }
    return Date.now() - this.lastFcHeartbeatAt;
  }

  buildFrame(nowMs: number): TelemetryFrame {
    const missionProgress: TelemetryMissionSnapshot | undefined =
      this.missionTotal > 0
        ? {
            seq: this.missionSeq,
            total: this.missionTotal,
            distToWpM: this.wpDistM > 0 ? this.wpDistM : undefined,
          }
        : this.missionSeq > 0
          ? {seq: this.missionSeq, total: 0, distToWpM: this.wpDistM}
          : undefined;

    return {
      t: nowMs,
      vehicleId: PRIMARY_TELEMETRY_VEHICLE_ID,
      source: TelemetrySourceKind.Mavlink,
      position: {
        lat: this.lat,
        lon: this.lon,
        altMsl: this.altMsl,
        altRel: this.altRel,
      },
      velocity: {vEast: this.vx, vNorth: this.vy, vUp: this.vz},
      headingDeg: this.headingDeg,
      groundSpeed: this.groundSpeed,
      climbSpeed: this.climb,
      attitude: {roll: this.roll, pitch: this.pitch, yaw: this.yaw},
      battery: {
        soc: this.batterySoc,
        voltage: this.voltage,
        currentAmps: this.current,
      },
      gps: {fix: this.gpsFix, satellites: this.sats, hdop: this.hdop},
      link: {
        quality: this.linkQuality,
        latencyMs: this.latencyMs,
        dropRate: this.dropRate,
      },
      system: {mode: this.mode, armed: this.armed},
      missionProgress,
      rc: this.rc,
    };
  }
}

function mapGpsFix(fixType: number): GpsFix {
  if (fixType >= 6) {
    return GpsFix.Rtk;
  }
  if (fixType >= 5) {
    return GpsFix.ThreeD;
  }
  if (fixType >= 4) {
    return GpsFix.ThreeD;
  }
  if (fixType >= 3) {
    return GpsFix.ThreeD;
  }
  if (fixType >= 2) {
    return GpsFix.TwoD;
  }
  return GpsFix.None;
}
