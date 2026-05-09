/**
 * Typed publish/subscribe bus for telemetry frames.
 *
 * Architectural intent:
 *   - Producers (sim, MAVLink, MQTT) call `publish(frame)`.
 *   - Consumers — the Zustand store, the watchdog, future audit log, future
 *     mission engine — call `subscribe(handler)` and handle frames in their
 *     own time. Handlers MUST be cheap and synchronous; heavy work goes
 *     into `requestAnimationFrame` or `queueMicrotask` inside the handler.
 *   - The bus is intentionally framework-free (no React, no Zustand)
 *     because future native MAVLink bridges will publish from native
 *     threads via the bridge.
 *
 * It also tracks the most recent frame so late subscribers can hydrate
 * without waiting for the next tick.
 */

import {log} from '../../core/logger/Logger';
import {type TelemetryFrame} from '../../core/types/telemetry';

export type FrameHandler = (frame: TelemetryFrame) => void;
export type Unsubscribe = () => void;

class TelemetryBusImpl {
  private readonly handlers = new Set<FrameHandler>();
  private last: TelemetryFrame | undefined;
  private publishCount = 0;

  publish(frame: TelemetryFrame): void {
    this.last = frame;
    this.publishCount++;
    if (this.handlers.size === 0) {
      return;
    }
    this.handlers.forEach(h => {
      try {
        h(frame);
      } catch (err) {
        log.telemetry.error('handler threw', {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    });
  }

  subscribe(handler: FrameHandler): Unsubscribe {
    this.handlers.add(handler);
    if (this.last) {
      try {
        handler(this.last);
      } catch (err) {
        log.telemetry.error('hydrate handler threw', {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
    return () => {
      this.handlers.delete(handler);
    };
  }

  getLast(): TelemetryFrame | undefined {
    return this.last;
  }

  /** Test-only / hard reset (e.g. when switching sources). */
  reset(): void {
    this.last = undefined;
    this.publishCount = 0;
  }

  /** Diagnostic. Useful in dev panels / future replay UI. */
  stats(): {publishCount: number; subscriberCount: number} {
    return {
      publishCount: this.publishCount,
      subscriberCount: this.handlers.size,
    };
  }
}

export const telemetryBus = new TelemetryBusImpl();
export type TelemetryBus = TelemetryBusImpl;
