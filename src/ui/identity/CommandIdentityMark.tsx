/**
 * Shared tactical identity mark (quadcopter + compass-inspired geometry).
 * Used by BootSplash, command-center trigger, and branding surfaces.
 */

import React from 'react';
import {View} from 'react-native';

// eslint-disable-next-line import/no-named-as-default
import Svg, {Circle, Path} from 'react-native-svg';

export interface CommandIdentityMarkProps {
  /** SVG canvas size in dp */
  readonly size: number;
  readonly accent: string;
  /** When true, draws a minimal dashed ring around the mark (command glyph). */
  readonly ring?: boolean;
}

const VB = 132;

export function CommandIdentityMark({
  size,
  accent,
  ring = false,
}: CommandIdentityMarkProps): React.JSX.Element {
  return (
    <View style={{width: size, height: size}} accessibilityLabel="GCS command mark">
      <Svg width={size} height={size} viewBox={`0 0 ${VB} ${VB}`}>
        {ring ? (
          <Circle
            cx={VB / 2}
            cy={VB / 2}
            r={VB / 2 - 4}
            stroke={accent}
            strokeOpacity={0.45}
            strokeWidth={1.4}
            strokeDasharray="4 6"
            fill="none"
          />
        ) : null}
        <Path
          d={`M${VB / 2} 6 L${VB / 2 - 12} 30 L${VB / 2 + 12} 30 Z`}
          fill={accent}
        />
        <Path
          d="M48 28 L84 28 L84 48 L106 48 L106 84 L84 84 L84 106 L48 106 L48 84 L26 84 L26 48 L48 48 Z"
          fill="rgba(10,15,22,0.94)"
          stroke={accent}
          strokeWidth={2}
          strokeLinejoin="round"
        />
        <Circle cx={VB / 2} cy={VB / 2} r={6} fill={accent} />
        <Circle cx={32} cy={32} r={5} fill={accent} />
        <Circle cx={VB - 32} cy={32} r={5} fill={accent} />
        <Circle cx={32} cy={VB - 32} r={5} fill={accent} />
        <Circle cx={VB - 32} cy={VB - 32} r={5} fill={accent} />
      </Svg>
    </View>
  );
}
