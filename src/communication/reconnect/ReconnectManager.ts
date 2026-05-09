import {log} from '../../core/logger/Logger';

/**
 * Coordinates bounded exponential backoff for transport restart attempts.
 */
export class ReconnectManager {
  private backoffMs: number;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private readonly maxBackoffMs: number;

  constructor(
    private readonly run: () => Promise<void>,
    opts?: {initialBackoffMs?: number; maxBackoffMs?: number},
  ) {
    this.backoffMs = opts?.initialBackoffMs ?? 1000;
    this.maxBackoffMs = opts?.maxBackoffMs ?? 30_000;
  }

  schedule(reason: string): void {
    if (this.timer) {
      return;
    }
    log.communication.warn('reconnect.scheduled', {reason, backoffMs: this.backoffMs});
    this.timer = setTimeout(() => {
      this.timer = null;
      this.run()
        .then(() => {
          this.backoffMs = 1000;
          log.communication.info('reconnect.success', {reason});
        })
        .catch(e => {
          log.communication.error('reconnect.failed', {
            reason,
            error: e instanceof Error ? e.message : String(e),
          });
          this.backoffMs = Math.min(this.backoffMs * 2, this.maxBackoffMs);
        });
    }, this.backoffMs);
  }

  cancel(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  resetBackoff(): void {
    this.backoffMs = 1000;
  }
}
