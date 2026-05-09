import {create} from 'zustand';

import {logger, type LogRecord} from '../../../core/logger/Logger';
import {mapLogRecordToTerminal} from '../ingestion/mapLogRecordToTerminal';

import type {TerminalPacketRecord} from './terminalPacketTypes';

export const TERMINAL_PACKET_CAP = 15_000;

let idSeq = 0;
function nextId(): string {
  idSeq += 1;
  return `tp-${Date.now()}-${idSeq}`;
}

function trimLines(lines: TerminalPacketRecord[]): TerminalPacketRecord[] {
  if (lines.length <= TERMINAL_PACKET_CAP) {
    return lines;
  }
  return lines.slice(lines.length - TERMINAL_PACKET_CAP);
}

/** Batched queue + rAF flush to avoid render storms under log bursts */
let pending: TerminalPacketRecord[] = [];
let flushScheduled = false;

function flushPending(
  set: (fn: (s: TerminalPacketState) => Partial<TerminalPacketState>) => void,
): void {
  if (pending.length === 0) {
    return;
  }
  const batch = pending;
  pending = [];
  set(s => ({
    lines: trimLines([...s.lines, ...batch]),
    revision: s.revision + 1,
  }));
}

function scheduleFlush(
  set: (fn: (s: TerminalPacketState) => Partial<TerminalPacketState>) => void,
): void {
  if (flushScheduled) {
    return;
  }
  flushScheduled = true;
  const run =
    typeof requestAnimationFrame === 'function'
      ? () => requestAnimationFrame(() => {
          flushScheduled = false;
          flushPending(set);
        })
      : () => {
          flushScheduled = false;
          setImmediate(() => flushPending(set));
        };
  run();
}

interface TerminalPacketState {
  lines: TerminalPacketRecord[];
  /** Incremented when lines mutate — narrow subscriptions can watch this */
  revision: number;
  appendFromLogger: (r: LogRecord) => void;
  appendSynthetic: (r: TerminalPacketRecord) => void;
  clear: () => void;
}

export const useTerminalPacketStore = create<TerminalPacketState>((set, get) => ({
  lines: [],
  revision: 0,

  appendFromLogger: r => {
    const mapped = mapLogRecordToTerminal(r, nextId());
    pending.push(mapped);
    scheduleFlush(set);
  },

  appendSynthetic: r => {
    pending.push({...r, id: r.id || nextId()});
    scheduleFlush(set);
  },

  clear: () => {
    pending = [];
    logger.clear();
    set({lines: [], revision: get().revision + 1});
  },
}));

let ingestAttached = false;

/** Subscribe logger → terminal ring buffer; hydrate from logger snapshot once */
export function ensureTerminalIngestAttached(): void {
  if (ingestAttached) {
    return;
  }
  ingestAttached = true;

  const snap = logger.snapshot();
  useTerminalPacketStore.setState({
    lines: trimLines(
      snap.map(r => mapLogRecordToTerminal(r, nextId())),
    ),
    revision: useTerminalPacketStore.getState().revision + 1,
  });

  logger.subscribe(record => {
    useTerminalPacketStore.getState().appendFromLogger(record);
  });
}
