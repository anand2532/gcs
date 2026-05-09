/**
 * Dev-oriented counters for hot-path telemetry (camera follow, trail redraw).
 * Zero overhead intent: in production builds without __DEV__, increments are
 * no-ops unless you enable COUNTERS_ALWAYS below for field diagnostics.
 *
 * Soak test procedure (manual QA):
 * - Cold launch → start sim → enable camera follow + flight trail for 30–60 min.
 * - Monitor `getPerfCountersSnapshot()` from a dev menu or Metro log every 10 min;
 *   counts should grow roughly linearly with time, not super-linearly (which
 *   would indicate render storms). Watch Android Studio / Xcode memory (RSS);
 *   it should plateau after trail buffer fills.
 * - Background the app 5× for 30s each; resume — no duplicate trail segments,
 *   camera follow still smooth.
 */

const COUNTERS_ALWAYS = false;

let trailRedraws = 0;
let cameraFollowCommands = 0;

export function recordTrailRedraw(): void {
  if (!__DEV__ && !COUNTERS_ALWAYS) {
    return;
  }
  trailRedraws++;
}

export function recordCameraFollowCommand(): void {
  if (!__DEV__ && !COUNTERS_ALWAYS) {
    return;
  }
  cameraFollowCommands++;
}

export function getPerfCountersSnapshot(): {
  trailRedraws: number;
  cameraFollowCommands: number;
} {
  return {
    trailRedraws,
    cameraFollowCommands,
  };
}

export function resetPerfCounters(): void {
  trailRedraws = 0;
  cameraFollowCommands = 0;
}
