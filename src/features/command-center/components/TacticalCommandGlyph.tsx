import React from 'react';
import {Pressable, StyleSheet, View} from 'react-native';

import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {FleetOpsMenuIcon} from '../../../ui/identity/FleetOpsMenuIcon';
import {useTheme} from '../../../ui/theme/ThemeProvider';

interface TacticalCommandGlyphProps {
  readonly open: boolean;
  readonly onPress: () => void;
}

/** Visible glyph size (dp); touch box scaled with icon for HUD ergonomics */
const GLYPH_VISUAL = 66;
const TOUCH = 108;
/** Shift artwork left so its left edge lines up with FAB column (`left: spacing.lg`), not the oversized touch box center */
const GLYPH_ALIGN_NUDGE_X = (TOUCH - GLYPH_VISUAL) / 2;

export function TacticalCommandGlyph({
  open,
  onPress,
}: TacticalCommandGlyphProps): React.JSX.Element {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const pressed = useSharedValue(1);

  const fadeStyle = useAnimatedStyle(() => ({
    opacity: pressed.value,
  }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        open ? 'Close command menu' : 'Open command menu'
      }
      hitSlop={{top: 4, bottom: 4, left: 6, right: 6}}
      onPress={onPress}
      onPressIn={() => {
        pressed.value = withTiming(0.82, {duration: 90});
      }}
      onPressOut={() => {
        pressed.value = withTiming(1, {duration: 140});
      }}
      style={[styles.hit, {marginLeft: -insets.left}]}>
      <Animated.View
        style={[
          styles.pad,
          fadeStyle,
          {transform: [{translateX: -GLYPH_ALIGN_NUDGE_X}]},
        ]}>
        <View style={styles.center}>
          <FleetOpsMenuIcon
            size={GLYPH_VISUAL}
            accent={theme.palette.accentCyan}
            active={open}
          />
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: {
    width: TOUCH,
    height: TOUCH,
    marginRight: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pad: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
