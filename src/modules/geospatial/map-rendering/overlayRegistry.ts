/**
 * Debounced overlay batching for GeoJSON churn — MapLibre ShapeSources should
 * not receive new object identity every React render.
 */

import {recordOverlayRegistryFlush} from '../../../app/runtime/perfCounters';

type Listener = () => void;

export class MapOverlayRegistry {
  private listeners = new Set<Listener>();
  private timer: ReturnType<typeof setTimeout> | null = null;

  scheduleFlush(delayMs = 48): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
    }
    this.timer = setTimeout(() => {
      this.timer = null;
      recordOverlayRegistryFlush();
      for (const l of this.listeners) {
        l();
      }
    }, delayMs);
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

export const globalOverlayRegistry = new MapOverlayRegistry();
