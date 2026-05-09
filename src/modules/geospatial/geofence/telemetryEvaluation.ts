import {geofenceEngine} from './engine';
import {log} from '../../../core/logger/Logger';
import {telemetryBus} from '../../telemetry/TelemetryBus';


const HYSTERESIS_MS = 850;

let bound = false;
let lastEmitAt = 0;
let lastZoneId: string | undefined;

/**
 * Subscribes to the telemetry bus and logs geofence violations with simple
 * hysteresis so transient GPS jitter does not spam the log.
 *
 * Call once at app entry alongside `bindBusToStore` from the telemetry module.
 */
export function bindGeofenceTelemetryEvaluation(): void {
  if (bound) {
    return;
  }
  bound = true;
  telemetryBus.subscribe(frame => {
    const v = geofenceEngine.evaluatePoint(frame.position);
    if (!v) {
      return;
    }
    const now = Date.now();
    if (v.zoneId === lastZoneId && now - lastEmitAt < HYSTERESIS_MS) {
      return;
    }
    lastEmitAt = now;
    lastZoneId = v.zoneId;
    log.map.warn('geofence.violation', {
      zoneId: v.zoneId,
      label: v.zoneLabel,
      message: v.message,
    });
  });
}
