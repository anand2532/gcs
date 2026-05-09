import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
  type TextStyle,
} from 'react-native';

import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import {GlassPanel} from './GlassPanel';
import {useTheme} from '../theme/ThemeProvider';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type FabTone = 'neutral' | 'cyan' | 'amber' | 'danger' | 'green';

interface FabProps {
  readonly onPress: () => void;
  /** Compact glyph (1–2 chars) for icon-style FABs. */
  readonly glyph?: string;
  /** Optional label rendered below the glyph. */
  readonly label?: string;
  readonly tone?: FabTone;
  readonly active?: boolean;
  readonly disabled?: boolean;
  readonly accessibilityLabel: string;
  readonly style?: ViewStyle;
  readonly size?: 'sm' | 'md';
}

export function FAB({
  onPress,
  glyph,
  label,
  tone = 'neutral',
  active = false,
  disabled = false,
  accessibilityLabel,
  style,
  size = 'md',
}: FabProps): React.JSX.Element {
  const theme = useTheme();
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{scale: scale.value}],
  }));

  const dim = size === 'sm' ? 44 : 56;
  const tint = toneTint(theme, tone);
  const accent = active ? tint.accent : theme.palette.fg200;
  const baseGlyphSize = size === 'sm' ? 18 : 20;
  const glyphSize = label ? baseGlyphSize : baseGlyphSize + 10;

  return (
    <AnimatedPressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      disabled={disabled}
      onPressIn={() => {
        scale.value = withSpring(0.92, {mass: 0.4, damping: 14});
      }}
      onPressOut={() => {
        scale.value = withSpring(1, {mass: 0.4, damping: 14});
      }}
      onPress={onPress}
      style={[
        animStyle,
        {opacity: disabled ? 0.5 : 1},
        style,
      ]}>
      <GlassPanel
        elevated
        intensity="standard"
        style={
          {
            width: dim,
            height: dim,
            borderRadius: theme.radius.lg,
            alignItems: 'center',
            justifyContent: 'center',
            borderColor: active ? tint.border : theme.palette.surfaceLine,
            borderWidth: StyleSheet.hairlineWidth,
          } as ViewStyle
        }>
        <View style={styles.inner}>
          {glyph ? (
            <Text
              style={
                [
                  styles.glyph,
                  {
                    color: accent,
                    fontSize: glyphSize,
                  },
                ] as TextStyle[]
              }>
              {glyph}
            </Text>
          ) : null}
          {label ? (
            <Text
              numberOfLines={1}
              style={[
                styles.label,
                {
                  color: accent,
                  letterSpacing: theme.typography.letterSpacing.tactical,
                  fontSize: theme.typography.size.xs,
                },
              ]}>
              {label}
            </Text>
          ) : null}
        </View>
      </GlassPanel>
    </AnimatedPressable>
  );
}

function toneTint(
  theme: ReturnType<typeof useTheme>,
  tone: FabTone,
): {accent: string; border: string} {
  const p = theme.palette;
  switch (tone) {
    case 'cyan':
      return {accent: p.accentCyan, border: p.accentCyan};
    case 'amber':
      return {accent: p.accentAmber, border: p.accentAmber};
    case 'danger':
      return {accent: p.danger, border: p.danger};
    case 'green':
      return {accent: p.accentGreen, border: p.accentGreen};
    case 'neutral':
    default:
      return {accent: p.fg100, border: p.surfaceLine};
  }
}

const styles = StyleSheet.create({
  inner: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  glyph: {
    fontWeight: '700',
  },
  label: {
    fontWeight: '600',
    marginTop: 2,
    textTransform: 'uppercase',
  },
});
