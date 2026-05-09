import {Easing} from 'react-native-reanimated';

/**
 * Curated easing curves for HUD/UI motion.
 * Tactical UI prefers crisp, slightly snappy curves over Material's bouncy
 * defaults — these match that aesthetic.
 */
export const easings = {
  standard: Easing.bezier(0.2, 0.0, 0, 1),
  emphasised: Easing.bezier(0.32, 0.72, 0, 1),
  crisp: Easing.bezier(0.5, 0.0, 0.2, 1),
  linear: Easing.linear,
} as const;
