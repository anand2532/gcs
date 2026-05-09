import UdpSockets from 'react-native-udp';

/**
 * UDP listener + sender for MAVLink (e.g. SITL or radio UDP bridge).
 */
export class UdpTransport {
  private socket: InstanceType<typeof UdpSockets.Socket> | null = null;
  private messageHandler:
    | ((data: Uint8Array, rinfo: {address: string; port: number}) => void)
    | undefined;

  bind(port: number): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const s = UdpSockets.createSocket({type: 'udp4'});
        this.socket = s;
        const onListening = (): void => {
          s.removeListener('listening', onListening);
          s.removeListener('error', onError);
          resolve();
        };
        const onError = (err: Error): void => {
          s.removeListener('listening', onListening);
          s.removeListener('error', onError);
          reject(err);
        };
        s.once('listening', onListening);
        s.once('error', onError);
        s.on('message', (msg, rinfo) => {
          if (!this.messageHandler) {
            return;
          }
          const buf =
            typeof Buffer !== 'undefined' && Buffer.isBuffer(msg)
              ? new Uint8Array(msg.buffer, msg.byteOffset, msg.byteLength)
              : new Uint8Array(msg as ArrayLike<number>);
          this.messageHandler(buf, {
            address: rinfo.address,
            port: rinfo.port,
          });
        });
        s.bind(port);
      } catch (e) {
        reject(e instanceof Error ? e : new Error(String(e)));
      }
    });
  }

  setMessageHandler(
    handler:
      | ((data: Uint8Array, rinfo: {address: string; port: number}) => void)
      | undefined,
  ): void {
    this.messageHandler = handler;
  }

  send(data: Uint8Array, port: number, address: string): Promise<void> {
    const s = this.socket;
    if (!s) {
      return Promise.reject(new Error('UdpTransport: socket not bound'));
    }
    return new Promise((resolve, reject) => {
      s.send(
        data as Buffer & Uint8Array,
        0,
        data.byteLength,
        port,
        address,
        (err?: Error) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        },
      );
    });
  }

  close(): void {
    if (this.socket) {
      try {
        this.socket.close();
      } catch {
        /* ignore */
      }
    }
    this.socket = null;
    this.messageHandler = undefined;
  }
}
