import {Platform} from 'react-native';

/**
 * USB serial (SiK radio / direct FC cable). Native driver integration is
 * Android-first; iOS requires MFi / network fallback — see doc/communication.md.
 */
export class UsbSerialTransport {

  open(_opts: {readonly baudRate: number}): Promise<void> {
    if (Platform.OS !== 'android') {
      return Promise.reject(
        new Error(
          'UsbSerialTransport: USB serial is only implemented for Android in this phase',
        ),
      );
    }
    return Promise.reject(
      new Error(
        'UsbSerialTransport: link react-native-usb-serialport-for-android (or custom Turbo Module) and wire native open/read.',
      ),
    );
  }

  close(): void {}

  setReadHandler(_handler: ((chunk: Uint8Array) => void) | undefined): void {}

  write(_chunk: Uint8Array): Promise<void> {
    return Promise.reject(new Error('UsbSerialTransport: not available'));
  }

}
