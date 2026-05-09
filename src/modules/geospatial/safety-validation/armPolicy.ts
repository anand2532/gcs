import {type MissionValidationResult} from '../../../core/types/missionPlanning';

/**
 * Returns true when operational policy should block arming (survey mission invalid).
 * Blocks on any validation issue with severity `error`.
 */
export function missionValidationBlocksArm(
  result: MissionValidationResult,
): boolean {
  return result.issues.some(i => i.severity === 'error');
}
