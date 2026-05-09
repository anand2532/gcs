/**
 * Glassmorphism surface used by HUD panels and FABs.
 *
 * Strategy:
 *   - Native blur via @react-native-community/blur on iOS/Android. On hosts
 *     where blur is unavailable (e.g. Jest, web), the component degrades to
 *     a translucent solid background — visually consistent, no crashes.
 *   - The panel is purely presentational; it doesn't manage its own layout.
 */

import React, {type ReactNode} from 'react';
import {Platform, StyleSheet, View, type ViewStyle} from 'react-native';

import {BlurView} from '@react-native-community/blur';

import {useTheme} from '../theme/ThemeProvider';

interface GlassPanelProps {
  readonly children: ReactNode;
  readonly style?: ViewStyle | ViewStyle[];
  readonly intensity?: 'subtle' | 'standard' | 'strong';
  readonly tint?: 'dark' | 'darkLow';
  readonly bordered?: boolean;
  readonly elevated?: boolean;
}

export function GlassPanel({
  children,
  style,
  intensity = 'standard',
  tint = 'dark',
  bordered = true,
  elevated = false,
}: GlassPanelProps): React.JSX.Element {
  const theme = useTheme();
  const blurAmount =
    intensity === 'subtle' ? 12 : intensity === 'strong' ? 24 : 18;

  const fallbackBg =
    tint === 'darkLow' ? theme.palette.surface : theme.palette.surfaceHigh;

  const containerStyles: ViewStyle[] = [
    styles.container,
    {
      borderRadius: theme.radius.md,
      borderColor: bordered ? theme.palette.surfaceLine : 'transparent',
      borderWidth: bordered ? StyleSheet.hairlineWidth : 0,
    },
    elevated ? styles.elevated : null,
    ...(Array.isArray(style) ? style : style ? [style] : []),
  ].filter(Boolean) as ViewStyle[];

  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    return (
      <View style={containerStyles}>
        <BlurView
          style={StyleSheet.absoluteFill}
          blurType="dark"
          blurAmount={blurAmount}
          reducedTransparencyFallbackColor={fallbackBg}
        />
        <View style={[StyleSheet.absoluteFill, {backgroundColor: fallbackBg, opacity: 0.55}]} />
        <View style={styles.content}>{children}</View>
      </View>
    );
  }

  return (
    <View style={[containerStyles, {backgroundColor: fallbackBg}]}>
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  content: {
    position: 'relative',
  },
  elevated: {
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 14,
    shadowOffset: {width: 0, height: 6},
    elevation: 8,
  },
});
