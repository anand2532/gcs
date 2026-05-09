import {type TelemetrySource} from '../../core/types/telemetry';

class TelemetrySourceRegistryImpl {
  private active: TelemetrySource | undefined;

  attach(source: TelemetrySource): void {
    if (this.active === source) {
      return;
    }
    this.active?.stop();
    this.active = source;
  }

  getActive(): TelemetrySource | undefined {
    return this.active;
  }

  startActive(): void {
    this.active?.start();
  }

  stopActive(): void {
    this.active?.stop();
  }
}

export const telemetrySourceRegistry = new TelemetrySourceRegistryImpl();
