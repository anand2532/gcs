/**
 * Simulation tuning constants. All values are deliberate and conservative —
 * the sim is meant to stand in for a real link, not a flight game.
 */

export const SIM_DEFAULTS = {
  /** Frames-per-second the engine emits at. */
  tickHz: 10,
  /** Default cruise speed for the demo mission, m/s. */
  cruiseSpeed: 12,
  /** Climb rate during takeoff phase, m/s. */
  climbRate: 3,
  /** Descent rate during landing phase, m/s. */
  descentRate: 1.5,
  /** Cruise altitude above home, metres. */
  cruiseAltMetres: 60,
  /** Acceptance radius if a waypoint doesn't define one, metres. */
  defaultAcceptanceRadiusMetres: 8,
  /** Yaw rate cap, deg/s — prevents teleporting heading. */
  yawRateDegPerSec: 90,
} as const;

export const TELEMETRY_FRESHNESS = {
  /** Frames older than this become STALE (ms). */
  staleAfterMs: 1500,
  /** Frames older than this become LOST (ms). */
  lostAfterMs: 5000,
  /** Watchdog tick rate (ms). */
  watchdogIntervalMs: 250,
} as const;

/** Hard cap on points the trail polyline keeps in memory. */
export const TRAIL_MAX_POINTS = 600;
