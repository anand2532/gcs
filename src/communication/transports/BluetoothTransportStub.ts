/**
 * Placeholder for Bluetooth Classic / BLE MAVLink framing.
 * Implement platform-specific RFCOMM / GATT once hardware profile is fixed.
 */
export class BluetoothTransportStub {
  async connect(_deviceId: string): Promise<void> {
    throw new Error(
      'BluetoothTransportStub: Bluetooth MAVLink transport not implemented yet',
    );
  }

  close(): void {}

  setReadHandler(_handler: ((chunk: Uint8Array) => void) | undefined): void {}
}
