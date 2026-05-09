/**
 * CRC_EXTRA bytes per MAVLink v2 message id (subset we decode/handle).
 * Source: message_definitions/v1.0/common.xml
 */

const MAP = new Map<number, number>([
  [0, 50], // HEARTBEAT
  [1, 124], // SYS_STATUS
  [22, 220], // PARAM_VALUE
  [24, 24], // GPS_RAW_INT
  [30, 39], // ATTITUDE
  [31, 154], // ATTITUDE_QUATERNION
  [33, 104], // GLOBAL_POSITION_INT
  [42, 28], // MISSION_CURRENT
  [43, 230], // MISSION_REQUEST_INT
  [44, 212], // MISSION_COUNT
  [47, 153], // MISSION_ACK
  [62, 183], // NAV_CONTROLLER_OUTPUT
  [65, 118], // RC_CHANNELS
  [73, 38], // MISSION_ITEM_INT
  [74, 20], // VFR_HUD
  [76, 152], // COMMAND_LONG
  [77, 143], // COMMAND_ACK
  [109, 221], // RADIO_STATUS
]);

export function getMavlinkCrcExtra(msgId: number): number | undefined {
  return MAP.get(msgId);
}
