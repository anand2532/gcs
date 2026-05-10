/**
 * Shortest-path heading interpolation for telemetry-driven animations.
 *
 * Telemetry reports heading in [0, 360) degrees each frame. Naively
 * accumulating deltas causes unbounded rotation values over time, which can
 * stress SVG/Reanimated native paths. Unwrapping against the previous
 * **radian** animation value picks the shortest turn across the wrap point.
 */

export function unwrapHeadingRadians(prevRad: number, measuredDeg: number): number {
  const twoPi = Math.PI * 2;
  let target = (measuredDeg * Math.PI) / 180;
  while (target - prevRad > Math.PI) {
    target -= twoPi;
  }
  while (target - prevRad < -Math.PI) {
    target += twoPi;
  }
  return target;
}
