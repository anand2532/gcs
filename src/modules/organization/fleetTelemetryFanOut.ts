import {PRIMARY_TELEMETRY_VEHICLE_ID} from './fleetConstants';
import {useFleetStore} from './fleetStore';
import {type TelemetryFrame} from '../../core/types/telemetry';
import {telemetryBus} from '../telemetry/TelemetryBus';

let attached = false;

/** Coalesce high-rate telemetry into periodic fleet updates (avoids Zustand + GC churn at 60 Hz sim). */
const pendingFrames = new Map<string, TelemetryFrame>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;

const FLEET_FANOUT_INTERVAL_MS = 100;

function flushFleetFrames(): void {
  flushTimer = null;
  if (pendingFrames.size === 0) {
    return;
  }
  pendingFrames.forEach((frame, vid) => {
    useFleetStore.getState().applyLiveFrame(vid, frame);
  });
  pendingFrames.clear();
}

function scheduleFleetFlush(): void {
  if (flushTimer !== null) {
    return;
  }
  flushTimer = setTimeout(flushFleetFrames, FLEET_FANOUT_INTERVAL_MS);
}

/**
 * Subscribes once to the telemetry bus and updates {@link useFleetStore} rows
 * for `frame.vehicleId` (or the primary mirror id when omitted).
 */
export function ensureFleetTelemetryFanOutAttached(): void {
  if (attached) {
    return;
  }
  attached = true;
  telemetryBus.subscribe(frame => {
    const vid = frame.vehicleId ?? PRIMARY_TELEMETRY_VEHICLE_ID;
    pendingFrames.set(vid, frame);
    scheduleFleetFlush();
  });
}
