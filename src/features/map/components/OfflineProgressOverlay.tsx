/**
 * OfflineProgressOverlay.
 *
 * Glass progress strip pinned under the HUD when an offline tile pack is
 * downloading. The component is fully driven by `useOfflineDownload`'s
 * state — no internal state, no side effects. It animates the bar width
 * via Reanimated `withTiming` so the progress fill stays smooth even when
 * the native side throttles status events.
 */

import React, {useEffect} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';

import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import {GlassPanel} from '../../../ui/components/GlassPanel';
import {useTheme} from '../../../ui/theme/ThemeProvider';
import {
  OfflineDownloadStatus,
  type UseOfflineDownloadState,
} from '../hooks/useOfflineDownload';

interface OfflineProgressOverlayProps extends UseOfflineDownloadState {
  readonly onDismiss?: () => void;
}

export function OfflineProgressOverlay({
  status,
  progress,
  tilesCompleted,
  tilesRequired,
  bytes,
  error,
  onDismiss,
}: OfflineProgressOverlayProps): React.JSX.Element | null {
  const theme = useTheme();
  const fill = useSharedValue(0);

  useEffect(() => {
    fill.value = withTiming(progress, {
      duration: 280,
      easing: Easing.out(Easing.quad),
    });
  }, [progress, fill]);

  const animatedFillStyle = useAnimatedStyle(() => ({
    width: `${fill.value * 100}%`,
  }));

  if (status === OfflineDownloadStatus.Idle) {
    return null;
  }

  const isComplete = status === OfflineDownloadStatus.Complete;
  const isError = status === OfflineDownloadStatus.Errored;
  const isWorking = status === OfflineDownloadStatus.Working;

  const accent = isError
    ? theme.palette.danger
    : isComplete
    ? theme.palette.accentGreen
    : theme.palette.accentCyan;

  const heading = isError
    ? 'Offline pack failed'
    : isComplete
    ? 'Cached for offline'
    : 'Caching visible area';

  const subtitle = isError
    ? error ?? 'Unknown error'
    : isWorking
    ? `${Math.round(progress * 100)}% • ${tilesCompleted}${tilesRequired ? ` / ${tilesRequired}` : ''} tiles • ${formatBytes(bytes)}`
    : `${tilesCompleted} tiles • ${formatBytes(bytes)}`;

  return (
    <View
      pointerEvents="box-none"
      style={styles.host}
      accessibilityLiveRegion="polite"
      accessibilityLabel={`${heading}. ${subtitle}`}>
      <GlassPanel
        elevated
        intensity="strong"
        style={[
          styles.card,
          {borderRadius: theme.radius.lg, paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md},
        ]}>
        <View style={styles.row}>
          <View style={[styles.dot, {backgroundColor: accent}]} />
          <Text
            numberOfLines={1}
            style={[
              styles.heading,
              {color: theme.palette.fg100, letterSpacing: theme.typography.letterSpacing.tactical},
            ]}>
            {heading}
          </Text>
          {(isComplete || isError) && onDismiss ? (
            <Pressable
              onPress={onDismiss}
              accessibilityRole="button"
              accessibilityLabel="Dismiss offline status"
              style={styles.dismiss}
              hitSlop={10}>
              <Text style={[styles.dismissGlyph, {color: theme.palette.fg300}]}>✕</Text>
            </Pressable>
          ) : null}
        </View>
        <Text
          numberOfLines={1}
          style={[styles.subtitle, {color: theme.palette.fg300}]}>
          {subtitle}
        </Text>
        <View
          style={[
            styles.track,
            {backgroundColor: theme.palette.surfaceLine},
          ]}>
          <Animated.View
            style={[
              styles.fill,
              animatedFillStyle,
              {backgroundColor: accent, opacity: isError ? 0.45 : 1},
            ]}
          />
        </View>
      </GlassPanel>
    </View>
  );
}

function formatBytes(bytes: number): string {
  if (bytes <= 0) {
    return '0 B';
  }
  const units = ['B', 'KB', 'MB', 'GB'];
  let v = bytes;
  let u = 0;
  while (v >= 1024 && u < units.length - 1) {
    v /= 1024;
    u++;
  }
  return `${v < 10 && u > 0 ? v.toFixed(1) : Math.round(v)} ${units[u]}`;
}

const styles = StyleSheet.create({
  host: {
    alignSelf: 'center',
    width: '92%',
    maxWidth: 520,
  },
  card: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  heading: {
    fontWeight: '700',
    fontSize: 12,
    textTransform: 'uppercase',
    flex: 1,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 12,
  },
  track: {
    marginTop: 10,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 2,
  },
  dismiss: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  dismissGlyph: {
    fontSize: 14,
    fontWeight: '700',
  },
});
