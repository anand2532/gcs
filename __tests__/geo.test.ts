import {describe, expect, it} from '@jest/globals';

import {isFiniteLngLat} from '../src/core/utils/geo';

describe('isFiniteLngLat', () => {
  it('accepts normal WGS84 coordinates', () => {
    expect(isFiniteLngLat(77.2295, 28.6129)).toBe(true);
  });

  it('rejects NaN and non-numbers', () => {
    expect(isFiniteLngLat(Number.NaN, 0)).toBe(false);
    expect(isFiniteLngLat(0, Number.NaN)).toBe(false);
    expect(isFiniteLngLat('77' as unknown as number, 28)).toBe(false);
  });
});
