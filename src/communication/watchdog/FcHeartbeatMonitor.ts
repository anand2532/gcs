/**
 * Tracks FC MAVLink HEARTBEAT freshness (distinct from frame-age TelemetryWatchdog).
 */
export class FcHeartbeatMonitor {
  private timer: ReturnType<typeof setInterval> | null = null;
  private wasStale = false;

  constructor(
    private readonly opts: {
      readonly staleMs: number;
      readonly pollMs: number;
      readonly getAgeMs: () => number | undefined;
      readonly onStale: () => void;
      readonly onRecover?: () => void;
    },
  ) {}

  start(): void {
    if (this.timer) {
      return;
    }
    this.timer = setInterval(() => this.tick(), this.opts.pollMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.wasStale = false;
  }

  private tick(): void {
    const age = this.opts.getAgeMs();
    if (age === undefined) {
      return;
    }
    const stale = age > this.opts.staleMs;
    if (stale && !this.wasStale) {
      this.opts.onStale();
    }
    if (!stale && this.wasStale) {
      this.opts.onRecover?.();
    }
    this.wasStale = stale;
  }
}
