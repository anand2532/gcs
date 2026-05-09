/**
 * Time helpers. Centralised so the watchdog and the sim engine agree on the
 * monotonic clock. `Date.now()` is good enough on RN for sub-second
 * freshness checks; we abstract it so it can be swapped for `performance.now`
 * later if Hermes adds a stable monotonic clock.
 */

export function now(): number {
  return Date.now();
}

/** Format milliseconds as HH:MM:SS for the HUD mission timer. */
export function formatHms(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) {
    return '00:00:00';
  }
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number): string => (n < 10 ? `0${n}` : String(n));
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}
