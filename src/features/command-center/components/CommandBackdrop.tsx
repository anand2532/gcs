import React from 'react';
import {Platform, Pressable, StyleSheet, View} from 'react-native';

import {BlurView} from '@react-native-community/blur';

import {useTheme} from '../../../ui/theme/ThemeProvider';

interface CommandBackdropProps {
  readonly onPress: () => void;
}

export function CommandBackdrop({onPress}: CommandBackdropProps): React.JSX.Element {
  const theme = useTheme();

  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Dismiss command center"
        onPress={onPress}
        style={StyleSheet.absoluteFill}>
        <BlurView
          style={StyleSheet.absoluteFill}
          blurType="dark"
          blurAmount={22}
          reducedTransparencyFallbackColor={theme.palette.bg900}
        />
        <View
          style={[StyleSheet.absoluteFill, {backgroundColor: theme.palette.bg900, opacity: 0.42}]}
        />
      </Pressable>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Dismiss command center"
      onPress={onPress}
      style={[StyleSheet.absoluteFill, {backgroundColor: 'rgba(5,8,12,0.72)'}]}
    />
  );
}
