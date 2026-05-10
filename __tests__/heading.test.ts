import {describe, expect, it} from '@jest/globals';

import {unwrapHeadingRadians} from '../src/core/utils/heading';

describe('unwrapHeadingRadians', () => {
  it('tracks measured heading without long-run drift past one revolution', () => {
    let rad = 0;
    for (const deg of [0, 90, 180, 270, 359, 1, 90]) {
      rad = unwrapHeadingRadians(rad, deg);
    }
    expect(Math.abs(rad)).toBeLessThan(Math.PI * 4);
  });

  it('chooses short path across 359° → 1° (~+2° step, not −358°)', () => {
    const prev = (359 * Math.PI) / 180;
    const next = unwrapHeadingRadians(prev, 1);
    expect(next - prev).toBeCloseTo((2 * Math.PI) / 180, 5);
  });
});
