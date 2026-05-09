import {create} from 'zustand';

export type CommandLifecycle =
  | 'SENT'
  | 'ACK'
  | 'NAK'
  | 'TIMEOUT'
  | 'RETRY';

export interface CommandEventRecord {
  readonly id: string;
  readonly t: number;
  readonly name: string;
  readonly lifecycle: CommandLifecycle;
  readonly correlationId?: string;
  readonly latencyMs?: number;
  readonly retryCount?: number;
  readonly failureReason?: string;
  readonly payload?: Record<string, unknown>;
}

const MAX_CMD = 400;

function trimCmd(arr: CommandEventRecord[]): CommandEventRecord[] {
  if (arr.length <= MAX_CMD) {
    return arr;
  }
  return arr.slice(arr.length - MAX_CMD);
}

interface CommandEventState {
  events: CommandEventRecord[];
  append: (e: Omit<CommandEventRecord, 'id'> & {id?: string}) => void;
  clear: () => void;
}

let seq = 0;
function nextCmdId(): string {
  seq += 1;
  return `cmd-${Date.now()}-${seq}`;
}

export const useCommandEventStore = create<CommandEventState>(set => ({
  events: [],
  append: e =>
    set(s => ({
      events: trimCmd([
        ...s.events,
        {...e, id: e.id ?? nextCmdId()},
      ]),
    })),
  clear: () => set({events: []}),
}));
