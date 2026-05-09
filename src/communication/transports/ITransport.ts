export interface TransportListenHandle {
  readonly close: () => void;
}

export interface IUdpTransport {
  bind(port: number): Promise<void>;
  close(): void;
  readonly onMessage: (handler: (data: Uint8Array, rinfo?: {address: string; port: number}) => void) => () => void;
  /** Send datagram (for GCS MAVLink sends). */
  send(data: Uint8Array, port: number, address: string): Promise<void>;
}
