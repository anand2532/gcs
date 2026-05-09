import {type CommandAckDecoded} from '../mavlink/mavlinkDecode';

type AckHandler = (ack: CommandAckDecoded) => void;

const handlers = new Set<AckHandler>();

export function subscribeCommandAck(handler: AckHandler): () => void {
  handlers.add(handler);
  return () => {
    handlers.delete(handler);
  };
}

export function emitCommandAck(ack: CommandAckDecoded): void {
  handlers.forEach(h => {
    try {
      h(ack);
    } catch {
      /* ignore */
    }
  });
}
