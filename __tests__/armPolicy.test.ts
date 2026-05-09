import {missionValidationBlocksArm} from '../src/modules/geospatial/safety-validation/armPolicy';

import type {MissionValidationResult} from '../src/core/types/missionPlanning';

function result(overrides: Partial<MissionValidationResult>): MissionValidationResult {
  return {
    valid: true,
    issues: [],
    estimatedDurationSec: 0,
    estimatedBatteryUsePct: 0,
    ...overrides,
  };
}

describe('missionValidationBlocksArm', () => {
  it('returns false when there are no error issues', () => {
    expect(
      missionValidationBlocksArm(
        result({
          valid: true,
          issues: [
            {code: 'POLYGON_TOO_SMALL', severity: 'warning', message: 'x'},
          ],
        }),
      ),
    ).toBe(false);
  });

  it('returns true when any error issue exists', () => {
    expect(
      missionValidationBlocksArm(
        result({
          valid: false,
          issues: [
            {code: 'POLICY_BLOCK', severity: 'error', message: 'blocked'},
          ],
        }),
      ),
    ).toBe(true);
  });
});
