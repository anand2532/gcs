/**
 * Placeholder for MQTT uplink/downlink — subscribe/publish schema TBD per ops stack.
 */
export class MqttTelemetryBridgeStub {
  async connect(_brokerUrl: string): Promise<void> {
    throw new Error(
      'MqttTelemetryBridgeStub: MQTT bridge not implemented — use UDP/TCP direct MAVLink or integrate native MQTT client',
    );
  }

  disconnect(): void {}
}
