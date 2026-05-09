import TcpSockets from 'react-native-tcp-socket';

/**
 * MAVLink-over-TCP client (companion computer / TCP bridges).
 */
export class TcpTransport {
  private socket: TcpSockets.Socket | null = null;
  private onDataFn: ((chunk: Uint8Array) => void) | undefined;

  connect(host: string, port: number): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const s = TcpSockets.createConnection({host, port}, () => {
          resolve();
        });
        this.socket = s;
        s.on('error', err => {
          reject(err);
        });
        s.on('data', (data: Buffer | string) => {
          if (!this.onDataFn) {
            return;
          }
          const u8 =
            typeof data === 'string'
              ? new Uint8Array(Buffer.from(data, 'utf8'))
              : new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
          this.onDataFn(u8);
        });
      } catch (e) {
        reject(e instanceof Error ? e : new Error(String(e)));
      }
    });
  }

  setDataHandler(handler: ((chunk: Uint8Array) => void) | undefined): void {
    this.onDataFn = handler;
  }

  write(chunk: Uint8Array): Promise<void> {
    const s = this.socket;
    if (!s) {
      return Promise.reject(new Error('TcpTransport: not connected'));
    }
    return new Promise((resolve, reject) => {
      s.write(Buffer.from(chunk), undefined, err => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  close(): void {
    try {
      this.socket?.destroy?.();
    } catch {
      /* ignore */
    }
    this.socket = null;
    this.onDataFn = undefined;
  }
}
