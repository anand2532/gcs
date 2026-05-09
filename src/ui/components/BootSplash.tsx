/**
 * BootSplash.
 *
 * Cinematic boot animation rendered on top of the app while it warms up.
 * Visual language matches the in-map drone glyph — a static cyan compass
 * ring with a rotating sweep + a quadcopter mark + a scanline progress bar.
 *
 * Composition (timeline):
 *   t=0      backdrop visible (theme bg900), grid lines fade in
 *   t=120ms  inner quadcopter glyph scales in (back-ease) and fades up
 *   t=300ms  outer compass ring scales in + sweep starts an infinite spin
 *   t=750ms  "GCS" wordmark fades in
 *   t=1100ms tagline fades in
 *   t=1300ms scanline progress bar fills left → right
 *   t=2200ms whole splash fades to transparent (450ms ease)
 *   t=2650ms `onDone` fires, parent unmounts the gate
 *
 * Design notes:
 *   - Renders a Reanimated overlay; no JS work after initial mount.
 *   - `pointerEvents="auto"` so taps are blocked during boot.
 *   - Skip on E2E tests by short-circuiting `onDone` immediately if
 *     `__BOOTSPLASH_SKIP__` is set (no test in Phase 1; placeholder).
 */

import React, {useEffect} from 'react';
import {StyleSheet, View} from 'react-native';

import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
// eslint-disable-next-line import/no-named-as-default
import Svg, {Circle, Line, Path} from 'react-native-svg';

import {useTheme} from '../theme/ThemeProvider';

interface BootSplashProps {
  readonly onDone: () => void;
  readonly durationMs?: number;
}

const RING_BOX = 240;
const BODY_BOX = 132;
const FADE_OUT_MS = 450;

export function BootSplash({
  onDone,
  durationMs = 2300,
}: BootSplashProps): React.JSX.Element {
  const theme = useTheme();
  const cyan = theme.palette.accentCyan;
  const cyanDim = theme.palette.accentCyanDim;
  const fg = theme.palette.fg100;
  const muted = theme.palette.fg300;

  const overlayOpacity = useSharedValue(1);
  const ringScale = useSharedValue(0.55);
  const ringOpacity = useSharedValue(0);
  const ringRotation = useSharedValue(0);
  const innerRingRotation = useSharedValue(0);
  const bodyScale = useSharedValue(0.7);
  const bodyOpacity = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const titleY = useSharedValue(8);
  const subtitleOpacity = useSharedValue(0);
  const barProgress = useSharedValue(0);
  const gridOpacity = useSharedValue(0);

  useEffect(() => {
    gridOpacity.value = withTiming(1, {duration: 320});

    bodyOpacity.value = withDelay(120, withTiming(1, {duration: 280}));
    bodyScale.value = withDelay(
      120,
      withTiming(1, {
        duration: 560,
        easing: Easing.out(Easing.back(1.6)),
      }),
    );

    ringOpacity.value = withDelay(300, withTiming(1, {duration: 380}));
    ringScale.value = withDelay(
      300,
      withTiming(1, {duration: 640, easing: Easing.out(Easing.cubic)}),
    );
    ringRotation.value = withRepeat(
      withTiming(360, {duration: 5200, easing: Easing.linear}),
      -1,
      false,
    );
    innerRingRotation.value = withRepeat(
      withTiming(-360, {duration: 7200, easing: Easing.linear}),
      -1,
      false,
    );

    titleOpacity.value = withDelay(750, withTiming(1, {duration: 360}));
    titleY.value = withDelay(
      750,
      withTiming(0, {duration: 380, easing: Easing.out(Easing.cubic)}),
    );

    subtitleOpacity.value = withDelay(1100, withTiming(1, {duration: 360}));

    barProgress.value = withDelay(
      1300,
      withTiming(1, {duration: 800, easing: Easing.out(Easing.cubic)}),
    );

    const handle = setTimeout(() => {
      overlayOpacity.value = withTiming(
        0,
        {duration: FADE_OUT_MS, easing: Easing.in(Easing.cubic)},
        finished => {
          if (finished) {
            runOnJS(onDone)();
          }
        },
      );
    }, durationMs - FADE_OUT_MS);
    return () => clearTimeout(handle);
  }, [
    durationMs,
    onDone,
    overlayOpacity,
    ringScale,
    ringOpacity,
    ringRotation,
    innerRingRotation,
    bodyScale,
    bodyOpacity,
    titleOpacity,
    titleY,
    subtitleOpacity,
    barProgress,
    gridOpacity,
  ]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));
  const gridStyle = useAnimatedStyle(() => ({opacity: gridOpacity.value * 0.5}));
  const ringStyle = useAnimatedStyle(() => ({
    opacity: ringOpacity.value,
    transform: [
      {scale: ringScale.value},
      {rotate: `${ringRotation.value}deg`},
    ],
  }));
  const innerRingStyle = useAnimatedStyle(() => ({
    opacity: ringOpacity.value * 0.7,
    transform: [{rotate: `${innerRingRotation.value}deg`}],
  }));
  const bodyStyle = useAnimatedStyle(() => ({
    opacity: bodyOpacity.value,
    transform: [{scale: bodyScale.value}],
  }));
  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{translateY: titleY.value}],
  }));
  const subtitleStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
  }));
  const barFillStyle = useAnimatedStyle(() => ({
    width: `${barProgress.value * 100}%`,
  }));

  return (
    <Animated.View
      pointerEvents="auto"
      accessibilityLabel="GCS booting"
      style={[
        StyleSheet.absoluteFill,
        styles.root,
        {backgroundColor: theme.palette.bg900},
        overlayStyle,
      ]}>
      {/* Soft tactical grid backdrop */}
      <Animated.View style={[StyleSheet.absoluteFill, gridStyle]} pointerEvents="none">
        <GridBackdrop color={cyan} />
      </Animated.View>

      <View style={styles.center}>
        <View
          style={{width: RING_BOX, height: RING_BOX, alignItems: 'center', justifyContent: 'center'}}>
          {/* Outer compass ring with sweep — rotates clockwise */}
          <Animated.View style={[StyleSheet.absoluteFill, styles.center, ringStyle]} pointerEvents="none">
            <Svg width={RING_BOX} height={RING_BOX} viewBox={`0 0 ${RING_BOX} ${RING_BOX}`}>
              <Circle
                cx={RING_BOX / 2}
                cy={RING_BOX / 2}
                r={RING_BOX / 2 - 6}
                stroke={cyan}
                strokeOpacity={0.55}
                strokeWidth={1.2}
                strokeDasharray="6 6"
                fill="none"
              />
              {/* Cardinal ticks */}
              <Line x1={RING_BOX / 2} y1={4} x2={RING_BOX / 2} y2={20} stroke={cyan} strokeWidth={2} />
              <Line x1={RING_BOX - 4} y1={RING_BOX / 2} x2={RING_BOX - 20} y2={RING_BOX / 2} stroke={cyan} strokeWidth={1.5} />
              <Line x1={RING_BOX / 2} y1={RING_BOX - 4} x2={RING_BOX / 2} y2={RING_BOX - 20} stroke={cyan} strokeWidth={1.5} />
              <Line x1={4} y1={RING_BOX / 2} x2={20} y2={RING_BOX / 2} stroke={cyan} strokeWidth={1.5} />
              {/* Sweep cone — quarter arc */}
              <Path
                d={`M${RING_BOX / 2} ${RING_BOX / 2} L${RING_BOX / 2} ${6} A${RING_BOX / 2 - 6} ${RING_BOX / 2 - 6} 0 0 1 ${RING_BOX - 6} ${RING_BOX / 2} Z`}
                fill={cyanDim}
                stroke={cyan}
                strokeOpacity={0.6}
                strokeWidth={1.2}
              />
            </Svg>
          </Animated.View>

          {/* Inner ring counter-rotates slowly for parallax */}
          <Animated.View style={[StyleSheet.absoluteFill, styles.center, innerRingStyle]} pointerEvents="none">
            <Svg width={RING_BOX - 64} height={RING_BOX - 64} viewBox={`0 0 ${RING_BOX - 64} ${RING_BOX - 64}`}>
              <Circle
                cx={(RING_BOX - 64) / 2}
                cy={(RING_BOX - 64) / 2}
                r={(RING_BOX - 64) / 2 - 4}
                stroke={cyan}
                strokeOpacity={0.4}
                strokeWidth={1}
                strokeDasharray="3 8"
                fill="none"
              />
            </Svg>
          </Animated.View>

          {/* Quadcopter mark — same glyph as the map marker */}
          <Animated.View style={[styles.center, bodyStyle]}>
            <Svg width={BODY_BOX} height={BODY_BOX} viewBox={`0 0 ${BODY_BOX} ${BODY_BOX}`}>
              {/* Forward arrow */}
              <Path d={`M${BODY_BOX / 2} 6 L${BODY_BOX / 2 - 12} 30 L${BODY_BOX / 2 + 12} 30 Z`} fill={cyan} />
              {/* Body cross */}
              <Path
                d="M48 28 L84 28 L84 48 L106 48 L106 84 L84 84 L84 106 L48 106 L48 84 L26 84 L26 48 L48 48 Z"
                fill="rgba(10,15,22,0.94)"
                stroke={cyan}
                strokeWidth={2}
                strokeLinejoin="round"
              />
              <Circle cx={BODY_BOX / 2} cy={BODY_BOX / 2} r={6} fill={cyan} />
              <Circle cx={32} cy={32} r={5} fill={cyan} />
              <Circle cx={BODY_BOX - 32} cy={32} r={5} fill={cyan} />
              <Circle cx={32} cy={BODY_BOX - 32} r={5} fill={cyan} />
              <Circle cx={BODY_BOX - 32} cy={BODY_BOX - 32} r={5} fill={cyan} />
            </Svg>
          </Animated.View>
        </View>

        <Animated.Text
          style={[
            styles.title,
            titleStyle,
            {color: fg, letterSpacing: theme.typography.letterSpacing.tactical},
          ]}>
          GCS
        </Animated.Text>
        <Animated.Text
          style={[
            styles.subtitle,
            subtitleStyle,
            {color: muted, letterSpacing: theme.typography.letterSpacing.wide},
          ]}>
          GROUND CONTROL · INITIALIZING TELEMETRY
        </Animated.Text>

        <View
          style={[
            styles.bar,
            {backgroundColor: theme.palette.surfaceLine, marginTop: theme.spacing.lg},
          ]}>
          <Animated.View style={[styles.barFill, barFillStyle, {backgroundColor: cyan}]} />
        </View>
      </View>
    </Animated.View>
  );
}

function GridBackdrop({color}: {color: string}): React.JSX.Element {
  // 9 vertical + 5 horizontal soft lines spanning the screen.
  const w = 1920;
  const h = 1080;
  const stepX = w / 12;
  const stepY = h / 7;
  const lines: React.JSX.Element[] = [];
  for (let i = 1; i < 12; i++) {
    lines.push(
      <Line
        key={`v${i}`}
        x1={i * stepX}
        y1={0}
        x2={i * stepX}
        y2={h}
        stroke={color}
        strokeOpacity={0.06}
        strokeWidth={1}
      />,
    );
  }
  for (let i = 1; i < 7; i++) {
    lines.push(
      <Line
        key={`h${i}`}
        x1={0}
        y1={i * stepY}
        x2={w}
        y2={i * stepY}
        stroke={color}
        strokeOpacity={0.06}
        strokeWidth={1}
      />,
    );
  }
  return (
    <Svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid slice">
      {lines}
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 56,
    fontWeight: '900',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 6,
    textTransform: 'uppercase',
  },
  bar: {
    width: 240,
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 2,
  },
});
