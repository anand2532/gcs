export const MAV_MODE_FLAG_SAFETY_ARMED = 128;

export interface HeartbeatDecoded {
  readonly type: 'HEARTBEAT';
  readonly baseMode: number;
  readonly customMode: number;
  readonly systemStatus: number;
  readonly mavlinkVersion: number;
}

export interface GlobalPositionIntDecoded {
  readonly type: 'GLOBAL_POSITION_INT';
  readonly latDeg: number;
  readonly lonDeg: number;
  readonly altMslM: number;
  readonly altRelM: number;
  readonly vxMs: number;
  readonly vyMs: number;
  readonly vzMs: number;
  readonly hdgDeg?: number;
}

export interface AttitudeDecoded {
  readonly type: 'ATTITUDE';
  readonly rollRad: number;
  readonly pitchRad: number;
  readonly yawRad: number;
}

export interface SysStatusDecoded {
  readonly type: 'SYS_STATUS';
  readonly voltageV: number;
  readonly currentA: number;
  readonly batteryPct?: number;
}

export interface GpsRawIntDecoded {
  readonly type: 'GPS_RAW_INT';
  readonly fixType: number;
  readonly satellites: number;
  readonly ephM?: number;
}

export interface VfrHudDecoded {
  readonly type: 'VFR_HUD';
  readonly groundspeedMs: number;
  readonly climbMs: number;
  readonly headingDeg: number;
}

export interface MissionCurrentDecoded {
  readonly type: 'MISSION_CURRENT';
  readonly seq: number;
}

export interface MissionCountDecoded {
  readonly type: 'MISSION_COUNT';
  readonly count: number;
}

export interface NavControllerOutputDecoded {
  readonly type: 'NAV_CONTROLLER_OUTPUT';
  readonly wpDistM: number;
  readonly navBearingCd: number;
  readonly targetBearingCd: number;
}

export interface RcChannelsDecoded {
  readonly type: 'RC_CHANNELS';
  readonly rssiU8?: number;
}

export interface RadioStatusDecoded {
  readonly type: 'RADIO_STATUS';
  readonly rssi?: number;
  readonly remrssi?: number;
}

export interface CommandAckDecoded {
  readonly type: 'COMMAND_ACK';
  readonly command: number;
  readonly result: number;
}

export type DecodedMavlinkPayload =
  | HeartbeatDecoded
  | GlobalPositionIntDecoded
  | AttitudeDecoded
  | SysStatusDecoded
  | GpsRawIntDecoded
  | VfrHudDecoded
  | MissionCurrentDecoded
  | MissionCountDecoded
  | NavControllerOutputDecoded
  | RcChannelsDecoded
  | RadioStatusDecoded
  | CommandAckDecoded;

function dv(payload: Uint8Array): DataView {
  return new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
}

export function decodePayload(msgId: number, payload: Uint8Array): DecodedMavlinkPayload | undefined {
  switch (msgId) {
    case 0:
      return decodeHeartbeat(payload);
    case 33:
      return decodeGlobalPositionInt(payload);
    case 30:
      return decodeAttitude(payload);
    case 1:
      return decodeSysStatus(payload);
    case 24:
      return decodeGpsRawInt(payload);
    case 74:
      return decodeVfrHud(payload);
    case 42:
      return decodeMissionCurrent(payload);
    case 44:
      return decodeMissionCount(payload);
    case 62:
      return decodeNavControllerOutput(payload);
    case 65:
      return decodeRcChannels(payload);
    case 109:
      return decodeRadioStatus(payload);
    case 77:
      return decodeCommandAck(payload);
    default:
      return undefined;
  }
}

function decodeHeartbeat(payload: Uint8Array): HeartbeatDecoded | undefined {
  if (payload.byteLength < 9) {
    return undefined;
  }
  const v = dv(payload);
  return {
    type: 'HEARTBEAT',
    baseMode: v.getUint8(2),
    customMode: v.getUint32(3, true),
    systemStatus: v.getUint8(7),
    mavlinkVersion: v.getUint8(8),
  };
}

function decodeGlobalPositionInt(payload: Uint8Array): GlobalPositionIntDecoded | undefined {
  if (payload.byteLength < 28) {
    return undefined;
  }
  const v = dv(payload);
  const lat = v.getInt32(0, true) / 1e7;
  const lon = v.getInt32(4, true) / 1e7;
  const altMm = v.getInt32(8, true);
  const relMm = v.getInt32(12, true);
  const vx = v.getInt16(16, true) / 100;
  const vy = v.getInt16(18, true) / 100;
  const vz = v.getInt16(20, true) / 100;
  const hdgRaw = v.getUint16(26, true);
  const hdgDeg = hdgRaw === 65535 ? undefined : hdgRaw / 100;
  return {
    type: 'GLOBAL_POSITION_INT',
    latDeg: lat,
    lonDeg: lon,
    altMslM: altMm / 1000,
    altRelM: relMm / 1000,
    vxMs: vx,
    vyMs: vy,
    vzMs: vz,
    hdgDeg,
  };
}

function decodeAttitude(payload: Uint8Array): AttitudeDecoded | undefined {
  if (payload.byteLength < 28) {
    return undefined;
  }
  const v = dv(payload);
  return {
    type: 'ATTITUDE',
    rollRad: v.getFloat32(0, true),
    pitchRad: v.getFloat32(4, true),
    yawRad: v.getFloat32(8, true),
  };
}

function decodeSysStatus(payload: Uint8Array): SysStatusDecoded | undefined {
  if (payload.byteLength < 13) {
    return undefined;
  }
  const v = dv(payload);
  const mv = v.getUint16(8, true);
  const ca = v.getInt16(10, true);
  const pctRaw = v.getInt8(12);
  return {
    type: 'SYS_STATUS',
    voltageV: mv > 0 ? mv / 1000 : 0,
    currentA: ca > 0 ? ca / 100 : 0,
    batteryPct: pctRaw >= 0 ? pctRaw : undefined,
  };
}

function decodeGpsRawInt(payload: Uint8Array): GpsRawIntDecoded | undefined {
  if (payload.byteLength < 30) {
    return undefined;
  }
  const v = dv(payload);
  const ephCm = v.getUint16(21, true);
  return {
    type: 'GPS_RAW_INT',
    fixType: v.getUint8(8),
    satellites: v.getUint8(29),
    ephM: ephCm > 0 ? ephCm / 100 : undefined,
  };
}

function decodeVfrHud(payload: Uint8Array): VfrHudDecoded | undefined {
  if (payload.byteLength < 20) {
    return undefined;
  }
  const v = dv(payload);
  return {
    type: 'VFR_HUD',
    groundspeedMs: v.getFloat32(4, true),
    climbMs: v.getFloat32(16, true),
    headingDeg: v.getInt16(8, true),
  };
}

function decodeMissionCurrent(payload: Uint8Array): MissionCurrentDecoded | undefined {
  if (payload.byteLength < 2) {
    return undefined;
  }
  const v = dv(payload);
  return {
    type: 'MISSION_CURRENT',
    seq: v.getUint16(0, true),
  };
}

function decodeMissionCount(payload: Uint8Array): MissionCountDecoded | undefined {
  if (payload.byteLength < 2) {
    return undefined;
  }
  const v = dv(payload);
  return {
    type: 'MISSION_COUNT',
    count: v.getUint16(0, true),
  };
}

function decodeNavControllerOutput(payload: Uint8Array): NavControllerOutputDecoded | undefined {
  if (payload.byteLength < 38) {
    return undefined;
  }
  const v = dv(payload);
  return {
    type: 'NAV_CONTROLLER_OUTPUT',
    wpDistM: v.getFloat32(24, true),
    navBearingCd: v.getInt16(30, true),
    targetBearingCd: v.getInt16(32, true),
  };
}

function decodeRcChannels(payload: Uint8Array): RcChannelsDecoded | undefined {
  if (payload.byteLength < 42) {
    return undefined;
  }
  const v = dv(payload);
  const rssi = v.getUint8(41);
  return {
    type: 'RC_CHANNELS',
    rssiU8: rssi <= 100 ? rssi : undefined,
  };
}

function decodeRadioStatus(payload: Uint8Array): RadioStatusDecoded | undefined {
  if (payload.byteLength < 6) {
    return undefined;
  }
  const v = dv(payload);
  return {
    type: 'RADIO_STATUS',
    rssi: v.getUint8(0),
    remrssi: v.getUint8(1),
  };
}

function decodeCommandAck(payload: Uint8Array): CommandAckDecoded | undefined {
  if (payload.byteLength < 3) {
    return undefined;
  }
  const v = dv(payload);
  return {
    type: 'COMMAND_ACK',
    command: v.getUint16(0, true),
    result: v.getUint8(2),
  };
}
