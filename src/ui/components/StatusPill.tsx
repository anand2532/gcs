import React, {useEffect} from 'react';
import {StyleSheet, Text, View, type ViewStyle} from 'react-native';

import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';

import {useTheme} from '../theme/ThemeProvider';

export type StatusPillTone = 'info' | 'ok' | 'warn' | 'danger' | 'neutral';

interface StatusPillProps {
  readonly label: string;
  readonly tone?: StatusPillTone;
  readonly pulsing?: boolean;
  readonly style?: ViewStyle;
}

export function StatusPill({
  label,
  tone = 'info',
  pulsing = false,
  style,
}: StatusPillProps): React.JSX.Element {
  const theme = useTheme();
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (pulsing) {
      pulse.value = withRepeat(
        withTiming(1, {duration: 900, easing: Easing.inOut(Easing.quad)}),
        -1,
        true,
      );
    } else {
      cancelAnimation(pulse);
      pulse.value = 0;
    }
    return () => {
      cancelAnimation(pulse);
    };
  }, [pulsing, pulse]);

  const dotStyle = useAnimatedStyle(() => ({
    opacity: pulsing ? 0.45 + pulse.value * 0.55 : 1,
    transform: [{scale: pulsing ? 0.9 + pulse.value * 0.25 : 1}],
  }));

  const colours = pillColours(theme, tone);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colours.bg,
          borderColor: colours.border,
          borderRadius: theme.radius.pill,
          paddingVertical: theme.spacing.xs,
          paddingHorizontal: theme.spacing.md,
        },
        style,
      ]}>
      <Animated.View
        style={[
          styles.dot,
          {backgroundColor: colours.dot},
          dotStyle,
        ]}
      />
      <Text
        style={[
          styles.label,
          {
            color: colours.fg,
            fontSize: theme.typography.size.xs,
            letterSpacing: theme.typography.letterSpacing.tactical,
          },
        ]}>
        {label}
      </Text>
    </View>
  );
}

function pillColours(
  theme: ReturnType<typeof useTheme>,
  tone: StatusPillTone,
): {bg: string; border: string; dot: string; fg: string} {
  const p = theme.palette;
  switch (tone) {
    case 'ok':
      return {bg: p.accentGreenDim, border: p.accentGreen, dot: p.accentGreen, fg: p.accentGreen};
    case 'warn':
      return {bg: p.accentAmberDim, border: p.warn, dot: p.warn, fg: p.warn};
    case 'danger':
      return {bg: p.dangerDim, border: p.danger, dot: p.danger, fg: p.danger};
    case 'neutral':
      return {bg: p.surface, border: p.surfaceLine, dot: p.fg400, fg: p.fg300};
    case 'info':
    default:
      return {bg: p.accentCyanDim, border: p.accentCyan, dot: p.accentCyan, fg: p.accentCyan};
  }
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  label: {
    fontWeight: '600',
    textTransform: 'uppercase',
  },
});
