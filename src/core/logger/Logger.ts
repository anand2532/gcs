/**
 * Structured, ring-buffered logger.
 *
 * The API is intentionally shaped to mirror what the future immutable audit
 * log subsystem will accept: every record is a serializable `LogRecord` with
 * a level, a category, a message, and a structured payload.
 *
 * Phase 1 keeps records in-memory only (ring buffer). Phase N+ subscribes
 * via `subscribe()` and sinks to durable, signed audit storage.
 */

import {now} from '../utils/time';

export const LogLevel = {
  Trace: 'trace',
  Debug: 'debug',
  Info: 'info',
  Warn: 'warn',
  Error: 'error',
} as const;
export type LogLevel = (typeof LogLevel)[keyof typeof LogLevel];

const LEVEL_ORDER: Record<LogLevel, number> = {
  trace: 0,
  debug: 1,
  info: 2,
  warn: 3,
  error: 4,
};

export type LogPayload = Record<string, unknown>;

function scrubPayload(input: unknown, depth = 0): unknown {
  if (depth > 8) {
    return '[DEPTH]';
  }
  if (input === null || input === undefined) {
    return input;
  }
  if (typeof input !== 'object') {
    return input;
  }
  if (Array.isArray(input)) {
    return input.map(x => scrubPayload(x, depth + 1));
  }
  const obj = input as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    const kl = k.toLowerCase();
    if (
      kl.includes('token') ||
      kl.includes('password') ||
      kl.includes('secret') ||
      kl.includes('authorization') ||
      kl === 'cookie'
    ) {
      out[k] = '[REDACTED]';
    } else {
      out[k] = scrubPayload(v, depth + 1) as unknown;
    }
  }
  return out;
}

export interface LogRecord {
  readonly t: number;
  readonly level: LogLevel;
  readonly category: string;
  readonly message: string;
  readonly payload?: LogPayload;
}

export type LogSink = (record: LogRecord) => void;

interface LoggerOptions {
  readonly minLevel: LogLevel;
  readonly bufferSize: number;
  readonly consoleSink: boolean;
}

class RingBuffer<T> {
  private readonly buf: (T | undefined)[];
  private readonly cap: number;
  private head = 0;
  private size = 0;

  constructor(capacity: number) {
    this.cap = capacity;
    this.buf = new Array<T | undefined>(capacity);
  }

  push(item: T): void {
    this.buf[this.head] = item;
    this.head = (this.head + 1) % this.cap;
    if (this.size < this.cap) {
      this.size++;
    }
  }

  snapshot(): T[] {
    const out: T[] = [];
    const start = this.size < this.cap ? 0 : this.head;
    for (let i = 0; i < this.size; i++) {
      const idx = (start + i) % this.cap;
      const item = this.buf[idx];
      if (item !== undefined) {
        out.push(item);
      }
    }
    return out;
  }

  clear(): void {
    this.head = 0;
    this.size = 0;
    for (let i = 0; i < this.cap; i++) {
      this.buf[i] = undefined;
    }
  }
}

class LoggerImpl {
  private readonly opts: LoggerOptions;
  private readonly buffer: RingBuffer<LogRecord>;
  private readonly sinks = new Set<LogSink>();

  constructor(opts: Partial<LoggerOptions> = {}) {
    this.opts = {
      minLevel: opts.minLevel ?? LogLevel.Info,
      bufferSize: opts.bufferSize ?? 500,
      consoleSink: opts.consoleSink ?? __DEV__,
    };
    this.buffer = new RingBuffer<LogRecord>(this.opts.bufferSize);
  }

  setMinLevel(level: LogLevel): void {
    (this.opts as {minLevel: LogLevel}).minLevel = level;
  }

  child(category: string): CategoryLogger {
    return new CategoryLogger(this, category);
  }

  subscribe(sink: LogSink): () => void {
    this.sinks.add(sink);
    return () => {
      this.sinks.delete(sink);
    };
  }

  snapshot(): LogRecord[] {
    return this.buffer.snapshot();
  }

  clear(): void {
    this.buffer.clear();
  }

  emit(
    level: LogLevel,
    category: string,
    message: string,
    payload?: LogPayload,
  ): void {
    if (LEVEL_ORDER[level] < LEVEL_ORDER[this.opts.minLevel]) {
      return;
    }
    const safePayload =
      payload !== undefined && payload !== null
        ? (scrubPayload(payload) as LogPayload)
        : undefined;
    const record: LogRecord = safePayload
      ? {t: now(), level, category, message, payload: safePayload}
      : {t: now(), level, category, message};
    this.buffer.push(record);
    if (this.opts.consoleSink) {
      const line = `[${level.toUpperCase()}][${category}] ${message}`;
      switch (level) {
        case LogLevel.Error:

          console.error(line, safePayload ?? '');
          break;
        case LogLevel.Warn:

          console.warn(line, safePayload ?? '');
          break;
        default:

          console.log(line, safePayload ?? '');
      }
    }
    if (this.sinks.size > 0) {
      this.sinks.forEach(s => {
        try {
          s(record);
        } catch {
          // swallow — a misbehaving sink must not break logging
        }
      });
    }
  }
}

export class CategoryLogger {
  constructor(
    private readonly logger: LoggerImpl,
    private readonly category: string,
  ) {}

  trace(message: string, payload?: LogPayload): void {
    this.logger.emit(LogLevel.Trace, this.category, message, payload);
  }

  debug(message: string, payload?: LogPayload): void {
    this.logger.emit(LogLevel.Debug, this.category, message, payload);
  }

  info(message: string, payload?: LogPayload): void {
    this.logger.emit(LogLevel.Info, this.category, message, payload);
  }

  warn(message: string, payload?: LogPayload): void {
    this.logger.emit(LogLevel.Warn, this.category, message, payload);
  }

  error(message: string, payload?: LogPayload): void {
    this.logger.emit(LogLevel.Error, this.category, message, payload);
  }

  /** Forward-compatible audit-grade event API. */
  event(name: string, payload?: LogPayload): void {
    this.logger.emit(LogLevel.Info, this.category, name, payload);
  }
}

export const logger = new LoggerImpl();

export const log = {
  app: logger.child('app'),
  telemetry: logger.child('telemetry'),
  sim: logger.child('sim'),
  map: logger.child('map'),
  store: logger.child('store'),
  watchdog: logger.child('watchdog'),
  communication: logger.child('communication'),
};
