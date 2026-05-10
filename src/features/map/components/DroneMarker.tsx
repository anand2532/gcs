/**
 * DroneMarker.
 *
 * A QGC-style top-down quadcopter glyph with:
 *   - a static compass ring + cardinal ticks (does NOT rotate with the
 *     vehicle; it is the world reference, like an HSI)
 *   - a rotating inner body whose forward arrow points along the current
 *     vehicle heading
 *   - an outer cyan glow that pulses subtly to draw the eye on busy maps
 *
 * Performance design (matters more than it seems):
 *   - The marker subscribes DIRECTLY to the telemetry bus, not via Zustand.
 *     A Zustand selector subscription on `state.frame` causes a React
 *     re-render every tick — fine for HUD numbers, expensive for a marker
 *     that touches native props.
 *   - Position is held as React state (React must commit to push the new
 *     coordinate to MarkerView). Updates are trailing-throttled to
 *     DRONE_MARKER_POSITION_MAX_HZ so high sim tick rates do not commit every
 *     frame; MapLibre still interpolates between commits on the native side.
 *   - Heading is animated via Reanimated `withTiming` on a `SharedValue`
 *     so the arrow eases to the new bearing without re-rendering React.
 */

import React, {useEffect, useRef, useState} from 'react';
import {Pressable, StyleSheet, View} from 'react-native';

import {MarkerView} from '@maplibre/maplibre-react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
// eslint-disable-next-line import/no-named-as-default
import Svg, {Circle, Line, Path} from 'react-native-svg';

import {DRONE_MARKER_POSITION_MAX_HZ} from '../../../core/constants/map';
import {isFiniteLngLat} from '../../../core/utils/geo';
import {unwrapHeadingRadians} from '../../../core/utils/heading';
import {trailingThrottle} from '../../../core/utils/throttle';
import {telemetryBus} from '../../../modules/telemetry';
import {useTheme} from '../../../ui/theme/ThemeProvider';

interface DroneMarkerProps {
  readonly initialCoordinate?: [number, number];
  readonly armed: boolean;
  readonly onArmToggle: () => void;
}

const SIZE = 84;
const RING_INSET = 4;
const BODY_SIZE = 60;

const MARKER_POSITION_INTERVAL_MS = Math.max(
  16,
  Math.ceil(1000 / DRONE_MARKER_POSITION_MAX_HZ),
);

export function DroneMarker({
  initialCoordinate,
  armed,
  onArmToggle,
}: DroneMarkerProps): React.JSX.Element | null {
  const theme = useTheme();
  const [coord, setCoord] = useState<[number, number] | null>(() => {
    if (!initialCoordinate) {
      return null;
    }
    const [lon, lat] = initialCoordinate;
    return isFiniteLngLat(lon, lat) ? [lon, lat] : null;
  });
  const headingRad = useSharedValue(0);
  const pulse = useSharedValue(0);

  /** One throttle for coords + heading so we never flood Reanimated / MarkerView. */
  const markerThrottle = useRef(
    trailingThrottle((lon: number, lat: number, headingDeg: number) => {
      if (
        !Number.isFinite(lon) ||
        !Number.isFinite(lat) ||
        !Number.isFinite(headingDeg)
      ) {
        return;
      }
      setCoord(prev => {
        if (prev && prev[0] === lon && prev[1] === lat) {
          return prev;
        }
        return [lon, lat];
      });
      cancelAnimation(headingRad);
      headingRad.value = withTiming(
        unwrapHeadingRadians(headingRad.value, headingDeg),
        {
          duration: 220,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        },
      );
    }, MARKER_POSITION_INTERVAL_MS),
  ).current;

  // Cancel trailing marker updates on unmount — flush() can still push coordinates
  // into MarkerView while native teardown is in progress.
  useEffect(() => () => markerThrottle.cancel(), [markerThrottle]);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, {duration: 1400, easing: Easing.inOut(Easing.cubic)}),
      -1,
      true,
    );
  }, [pulse]);

  useEffect(() => {
    return telemetryBus.subscribe(frame => {
      markerThrottle.call(
        frame.position.lon,
        frame.position.lat,
        frame.headingDeg,
      );
    });
  }, [markerThrottle]);

  const rotateStyle = useAnimatedStyle(() => ({
    transform: [{rotate: `${headingRad.value}rad`}],
  }));
  const pulseStyle = useAnimatedStyle(() => ({
    opacity: 0.35 + pulse.value * 0.4,
    transform: [{scale: 0.92 + pulse.value * 0.18}],
  }));

  if (!coord || !isFiniteLngLat(coord[0], coord[1])) {
    return null;
  }

  const tint = armed ? theme.palette.danger : theme.palette.accentGreen;
  /** Outer HSI ring / ticks: avoid danger red (reads as a harsh “box” around the icon when armed). */
  const compassAccent = armed ? theme.palette.accentCyan : theme.palette.accentGreen;
  const airframeStroke = armed ? 'rgba(220,226,235,0.72)' : tint;

  return (
    <MarkerView coordinate={coord} anchor={{x: 0.5, y: 0.5}}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={armed ? 'Disarm vehicle' : 'Arm vehicle'}
        hitSlop={10}
        onPress={onArmToggle}
        style={styles.markerWrap}>
        {/* Soft pulsing glow under the icon */}
        <Animated.View
          style={[
            styles.glow,
            pulseStyle,
            {
              backgroundColor: armed
                ? 'rgba(255,71,87,0.12)'
                : 'rgba(72,214,124,0.16)',
            },
          ]}
        />

        {/* Static compass ring (world reference — does NOT rotate) */}
        <View style={[StyleSheet.absoluteFill, styles.center]} pointerEvents="none">
          <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
            <Circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={SIZE / 2 - RING_INSET}
              stroke={compassAccent}
              strokeOpacity={0.55}
              strokeWidth={1}
              fill={armed ? 'rgba(45,55,72,0.22)' : 'rgba(72,214,124,0.06)'}
            />
            {/* N tick (top) — slightly bolder so 'up = north' is unambiguous */}
            <Line
              x1={SIZE / 2}
              y1={2}
              x2={SIZE / 2}
              y2={11}
              stroke={compassAccent}
              strokeWidth={2}
            />
            {/* E / S / W ticks */}
            <Line
              x1={SIZE - 2}
              y1={SIZE / 2}
              x2={SIZE - 11}
              y2={SIZE / 2}
              stroke={compassAccent}
              strokeWidth={1}
              opacity={0.7}
            />
            <Line
              x1={SIZE / 2}
              y1={SIZE - 2}
              x2={SIZE / 2}
              y2={SIZE - 11}
              stroke={compassAccent}
              strokeWidth={1}
              opacity={0.7}
            />
            <Line
              x1={2}
              y1={SIZE / 2}
              x2={11}
              y2={SIZE / 2}
              stroke={compassAccent}
              strokeWidth={1}
              opacity={0.7}
            />
          </Svg>
        </View>

        {/* Rotating quadcopter body — heading arrow is the wide spine on top */}
        <Animated.View style={[StyleSheet.absoluteFill, styles.center, rotateStyle]} pointerEvents="none">
          <Svg
            width={BODY_SIZE}
            height={BODY_SIZE}
            viewBox={`0 0 ${BODY_SIZE} ${BODY_SIZE}`}>
            {/* Forward heading arrow */}
            <Path
              d={`M${BODY_SIZE / 2} 0 L${BODY_SIZE / 2 - 6} 14 L${BODY_SIZE / 2 + 6} 14 Z`}
              fill={tint}
            />
            {/* Cross / quad-rotor body */}
            <Path
              d="M22 12 L38 12 L38 22 L48 22 L48 38 L38 38 L38 48 L22 48 L22 38 L12 38 L12 22 L22 22 Z"
              fill="rgba(10,15,22,0.92)"
              stroke={airframeStroke}
              strokeWidth={1.6}
              strokeLinejoin="round"
            />
            {/* Center hub */}
            <Circle cx={30} cy={30} r={4} fill={tint} />
            {/* Four propeller hubs */}
            <Circle cx={16} cy={16} r={3} fill={tint} />
            <Circle cx={44} cy={16} r={3} fill={tint} />
            <Circle cx={16} cy={44} r={3} fill={tint} />
            <Circle cx={44} cy={44} r={3} fill={tint} />
          </Svg>
        </Animated.View>
      </Pressable>
    </MarkerView>
  );
}

const styles = StyleSheet.create({
  markerWrap: {
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: SIZE - 18,
    height: SIZE - 18,
    borderRadius: (SIZE - 18) / 2,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
