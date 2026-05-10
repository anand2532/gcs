/**
 * CompassWidget.
 *
 * Translucent flight-instrument-style compass dial. North is fixed at
 * the top — a cyan needle rotates to point along the current vehicle
 * heading. This complements the HSI ring on the drone marker: the
 * marker shows heading "in place" on the map; this widget shows the
 * absolute direction at a glance from the corner of the eye.
 *
 * Visual design:
 *   - Soft glass background (low alpha) so satellite imagery still
 *     reads through.
 *   - N tick is bold + amber-cyan. E/S/W are subtler.
 *   - Diagonal hairline ticks at 30° increments for analog texture.
 *
 * Performance design:
 *   - Subscribes directly to the telemetry bus (NOT Zustand) so the
 *     widget never causes a React re-render on every frame. Heading
 *     animates on a Reanimated SharedValue, which writes to the worklet
 *     thread and skips React entirely.
 *   - Wrap-aware shortest-path interpolation — same trick as DroneMarker —
 *     so 359° -> 1° doesn't spin the needle nearly all the way around.
 */

import React, {useEffect, useRef, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';

import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
// eslint-disable-next-line import/no-named-as-default
import Svg, {Circle, G, Line, Path, Text as SvgText} from 'react-native-svg';

import {unwrapHeadingRadians} from '../../core/utils/heading';
import {trailingThrottle} from '../../core/utils/throttle';
import {telemetryBus} from '../../modules/telemetry';
import {useTheme} from '../theme/ThemeProvider';

/** Match map marker / trail budget — compass must not run Reanimated at telemetry Hz. */
const COMPASS_ANIM_MAX_HZ = 15;
const COMPASS_ANIM_INTERVAL_MS = Math.max(
  40,
  Math.ceil(1000 / COMPASS_ANIM_MAX_HZ),
);

const AnimatedG = Animated.createAnimatedComponent(G);

interface CompassWidgetProps {
  readonly size?: number;
  readonly opacity?: number;
}

/**
 * Why a single SVG canvas (no GlassPanel wrapper)?
 *
 * Earlier the dial sat inside a circular `GlassPanel` whose `overflow: hidden`
 * was meant to clip the SVG to a circle. On Android the rotation transform on
 * the rotating needle layer occasionally rendered onto a hardware-accelerated
 * layer that escaped the parent's elliptical clip, leaving a stray arc beneath
 * the dial. We sidestep the bug entirely by drawing the entire compass —
 * background disc, ring, ticks, cardinals, needle, hub — inside one SVG that
 * has no parent clipping at all. The result is also cheaper because it removes
 * the BlurView pass.
 */
export function CompassWidget({
  size = 96,
  opacity = 0.78,
}: CompassWidgetProps): React.JSX.Element {
  const theme = useTheme();
  /** Degrees for SVG `rotate()` — unwrapped each tick via radians then converted back. */
  const headingDegAnimated = useSharedValue(0);
  const [headingText, setHeadingText] = useState('000');

  const compassThrottle = useRef(
    trailingThrottle((headingDegMeasured: number) => {
      if (!Number.isFinite(headingDegMeasured)) {
        return;
      }
      cancelAnimation(headingDegAnimated);
      const prevRad = (headingDegAnimated.value * Math.PI) / 180;
      const targetRad = unwrapHeadingRadians(prevRad, headingDegMeasured);
      headingDegAnimated.value = withTiming((targetRad * 180) / Math.PI, {
        duration: 220,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      });

      const display = Math.round(
        ((headingDegMeasured % 360) + 360) % 360,
      );
      setHeadingText(String(display).padStart(3, '0'));
    }, COMPASS_ANIM_INTERVAL_MS),
  ).current;

  useEffect(() => () => compassThrottle.flush(), [compassThrottle]);

  useEffect(() => {
    return telemetryBus.subscribe(frame => {
      compassThrottle.call(frame.headingDeg);
    });
  }, [compassThrottle]);

  const cyan = theme.palette.accentCyan;
  const fgMuted = theme.palette.fg300;

  const cx = size / 2;
  // Reserve a 1px margin so the outer stroke never touches the SVG edge.
  const ring = size / 2 - 1;
  const cardinalRadius = ring - 10;

  const needleProps = useAnimatedProps(
    () => ({
      transform: `rotate(${headingDegAnimated.value} ${cx} ${cx})`,
    }),
    [cx],
  );

  // 12 tick marks every 30°
  const ticks: React.JSX.Element[] = [];
  for (let i = 0; i < 12; i++) {
    const angle = (i * 30 * Math.PI) / 180;
    const isMajor = i % 3 === 0;
    const inner = ring - (isMajor ? 7 : 4);
    const outer = ring - 1;
    const x1 = cx + Math.sin(angle) * inner;
    const y1 = cx - Math.cos(angle) * inner;
    const x2 = cx + Math.sin(angle) * outer;
    const y2 = cx - Math.cos(angle) * outer;
    ticks.push(
      <Line
        key={i}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={isMajor ? cyan : fgMuted}
        strokeWidth={isMajor ? 1.6 : 1}
        strokeOpacity={isMajor ? 0.85 : 0.45}
        strokeLinecap="round"
      />,
    );
  }

  const needleTip = cx - cardinalRadius + 1;
  const needleTail = cx + cardinalRadius - 1;

  return (
    <View
      pointerEvents="none"
      accessibilityLabel={`Heading ${headingText} degrees`}
      style={[styles.host, {width: size, height: size, opacity}]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Disc background: very faint cyan tint over a dark fill so the
            satellite imagery still hints through */}
        <Circle cx={cx} cy={cx} r={ring} fill="rgba(7,11,18,0.55)" />
        <Circle
          cx={cx}
          cy={cx}
          r={ring}
          stroke={cyan}
          strokeOpacity={0.45}
          strokeWidth={1}
          fill="none"
        />
        {ticks}
        <SvgText
          x={cx}
          y={cx - cardinalRadius + 5}
          fontSize={11}
          fontWeight="700"
          fill={cyan}
          textAnchor="middle">
          N
        </SvgText>
        <SvgText
          x={cx + cardinalRadius}
          y={cx + 4}
          fontSize={9}
          fontWeight="600"
          fill={fgMuted}
          textAnchor="middle">
          E
        </SvgText>
        <SvgText
          x={cx}
          y={cx + cardinalRadius + 1}
          fontSize={9}
          fontWeight="600"
          fill={fgMuted}
          textAnchor="middle">
          S
        </SvgText>
        <SvgText
          x={cx - cardinalRadius}
          y={cx + 4}
          fontSize={9}
          fontWeight="600"
          fill={fgMuted}
          textAnchor="middle">
          W
        </SvgText>

        {/* Rotating needle group — rotation happens in SVG-coordinate space
            so it cannot escape the canvas (avoiding the Android clip bug
            we hit when this was an Animated.View with a CSS transform). */}
        <AnimatedG animatedProps={needleProps}>
          <Path
            d={`M${cx} ${needleTip} L${cx - 5} ${cx + 1} L${cx + 5} ${cx + 1} Z`}
            fill={cyan}
          />
          <Path
            d={`M${cx} ${needleTail} L${cx - 4} ${cx - 1} L${cx + 4} ${cx - 1} Z`}
            fill={fgMuted}
            opacity={0.55}
          />
          <Circle cx={cx} cy={cx} r={4} fill={cyan} />
          <Circle cx={cx} cy={cx} r={2} fill={theme.palette.bg900} />
        </AnimatedG>
      </Svg>

      {/* Heading readout overlaid in the lower half */}
      <Text
        numberOfLines={1}
        style={[
          styles.readout,
          {
            bottom: Math.max(6, size * 0.12),
            color: theme.palette.fg100,
            letterSpacing: theme.typography.letterSpacing.tactical,
          },
        ]}>
        {headingText}°
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  readout: {
    position: 'absolute',
    fontSize: 10,
    fontWeight: '700',
  },
});
