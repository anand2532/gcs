import {useCallback} from 'react';

import {
  Easing,
  runOnJS,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

const ENTER_MS = 260;
const EXIT_MS = 220;

export interface CommandCenterMotion {
  readonly backdropOpacity: SharedValue<number>;
  readonly panelOpacity: SharedValue<number>;
  readonly panelScale: SharedValue<number>;
  readonly panelTranslateY: SharedValue<number>;
  enter: () => void;
  exit: (onDone?: () => void) => void;
}

export function useCommandCenterMotion(): CommandCenterMotion {
  const backdropOpacity = useSharedValue(0);
  const panelOpacity = useSharedValue(0);
  const panelScale = useSharedValue(0.94);
  const panelTranslateY = useSharedValue(12);

  const enter = useCallback(() => {
    backdropOpacity.value = withTiming(1, {
      duration: ENTER_MS,
      easing: Easing.out(Easing.cubic),
    });
    panelOpacity.value = withTiming(1, {
      duration: ENTER_MS,
      easing: Easing.out(Easing.cubic),
    });
    panelScale.value = withSpring(1, {damping: 18, stiffness: 280});
    panelTranslateY.value = withSpring(0, {damping: 20, stiffness: 320});
  }, [backdropOpacity, panelOpacity, panelScale, panelTranslateY]);

  const exit = useCallback(
    (onDone?: () => void) => {
      backdropOpacity.value = withTiming(
        0,
        {duration: EXIT_MS, easing: Easing.in(Easing.cubic)},
        finished => {
          if (finished && onDone) {
            runOnJS(onDone)();
          }
        },
      );
      panelOpacity.value = withTiming(0, {
        duration: EXIT_MS,
        easing: Easing.in(Easing.cubic),
      });
      panelScale.value = withTiming(0.94, {duration: EXIT_MS});
      panelTranslateY.value = withTiming(8, {duration: EXIT_MS});
    },
    [backdropOpacity, panelOpacity, panelScale, panelTranslateY],
  );

  return {
    backdropOpacity,
    panelOpacity,
    panelScale,
    panelTranslateY,
    enter,
    exit,
  };
}
