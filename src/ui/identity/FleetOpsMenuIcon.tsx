/**
 * Fleet operations menu glyph: EO/IR sight brackets + horizon arc + bore sight.
 * Line-only artwork — reads as instrumentation, not a raised button.
 */

import React from 'react';
import {View} from 'react-native';

// eslint-disable-next-line import/no-named-as-default
import Svg, {Circle, Path} from 'react-native-svg';

export interface FleetOpsMenuIconProps {
  readonly size: number;
  readonly accent: string;
  /** Slightly emphasize stroke when command surface is open */
  readonly active?: boolean;
}

const VB = 48;

export function FleetOpsMenuIcon({
  size,
  accent,
  active = false,
}: FleetOpsMenuIconProps): React.JSX.Element {
  const dim = active ? 0.95 : 0.72;
  const fine = active ? 0.55 : 0.42;

  return (
    <View style={{width: size, height: size}} pointerEvents="none">
      <Svg width={size} height={size} viewBox={`0 0 ${VB} ${VB}`}>
        {/* Corner brackets — sight / vision framing */}
        <Path
          d="M 10 18 L 10 10 L 18 10"
          stroke={accent}
          strokeOpacity={dim}
          strokeWidth={1.65}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <Path
          d="M 30 10 L 38 10 L 38 18"
          stroke={accent}
          strokeOpacity={dim}
          strokeWidth={1.65}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <Path
          d="M 38 30 L 38 38 L 30 38"
          stroke={accent}
          strokeOpacity={dim}
          strokeWidth={1.65}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <Path
          d="M 18 38 L 10 38 L 10 30"
          stroke={accent}
          strokeOpacity={dim}
          strokeWidth={1.65}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {/* Horizon arc — stable attitude cue */}
        <Path
          d="M 14 28 Q 24 22 34 28"
          stroke={accent}
          strokeOpacity={fine}
          strokeWidth={1.25}
          strokeLinecap="round"
          fill="none"
        />
        {/* Bore / task focus */}
        <Circle cx={24} cy={26} r={2.25} fill={accent} fillOpacity={active ? 1 : 0.85} />
        <Circle
          cx={24}
          cy={26}
          r={5.5}
          stroke={accent}
          strokeOpacity={active ? 0.45 : 0.28}
          strokeWidth={1}
          fill="none"
        />
      </Svg>
    </View>
  );
}
