/**
 * Rolling-buffer flight trail.
 *
 * The trail is drawn as a single GeoJSON LineString rendered by a native
 * LineLayer over a ShapeSource. Updates are batched at telemetry rate, but
 * we cap the buffer at TRAIL_MAX_POINTS so the source diff stays cheap as
 * a flight grows long.
 */

import React, {useEffect, useRef, useState} from 'react';

import {LineLayer, ShapeSource} from '@maplibre/maplibre-react-native';

import {recordTrailRedraw} from '../../../app/runtime/perfCounters';
import {FLIGHT_TRAIL_REDRAW_MAX_HZ} from '../../../core/constants/map';
import {TRAIL_MAX_POINTS} from '../../../core/constants/sim';
import {trailingThrottle} from '../../../core/utils/throttle';
import {telemetryBus} from '../../../modules/telemetry';
import {useTheme} from '../../../ui/theme/ThemeProvider';

const SOURCE_ID = 'gcs.trail.source';
const LAYER_ID = 'gcs.trail.layer';
const GLOW_LAYER_ID = 'gcs.trail.glow';

interface TrailFeature {
  readonly type: 'Feature';
  readonly geometry: {
    readonly type: 'LineString';
    readonly coordinates: number[][];
  };
  readonly properties: Record<string, never>;
}

const TRAIL_REDRAW_INTERVAL_MS = Math.max(
  16,
  Math.ceil(1000 / FLIGHT_TRAIL_REDRAW_MAX_HZ),
);

export function FlightTrail(): React.JSX.Element | null {
  const theme = useTheme();
  // Buffer lives in a ref to avoid GC on every push; we mirror it into
  // state at a capped rate so ShapeSource diffs do not track raw telemetry Hz.
  const buffer = useRef<number[][]>([]);
  const [feature, setFeature] = useState<TrailFeature | null>(null);

  const redrawThrottle = useRef(
    trailingThrottle(() => {
      if (buffer.current.length < 2) {
        return;
      }
      recordTrailRedraw();
      setFeature({
        type: 'Feature',
        geometry: {type: 'LineString', coordinates: [...buffer.current]},
        properties: {},
      });
    }, TRAIL_REDRAW_INTERVAL_MS),
  ).current;

  useEffect(() => () => redrawThrottle.flush(), [redrawThrottle]);

  useEffect(() => {
    return telemetryBus.subscribe(frame => {
      const next: number[] = [frame.position.lon, frame.position.lat];
      const last = buffer.current[buffer.current.length - 1];
      if (last && last[0] === next[0] && last[1] === next[1]) {
        return;
      }
      buffer.current.push(next);
      if (buffer.current.length > TRAIL_MAX_POINTS) {
        buffer.current.splice(0, buffer.current.length - TRAIL_MAX_POINTS);
      }
      if (buffer.current.length < 2) {
        return;
      }
      redrawThrottle.call();
    });
  }, [redrawThrottle]);

  if (!feature) {
    return null;
  }

  return (
    <ShapeSource id={SOURCE_ID} shape={feature}>
      <LineLayer
        id={GLOW_LAYER_ID}
        style={{
          lineColor: theme.palette.trailGlow,
          lineWidth: 8,
          lineOpacity: 0.6,
          lineCap: 'round',
          lineJoin: 'round',
        }}
      />
      <LineLayer
        id={LAYER_ID}
        style={{
          lineColor: theme.palette.trail,
          lineWidth: 2.5,
          lineOpacity: 0.95,
          lineCap: 'round',
          lineJoin: 'round',
        }}
      />
    </ShapeSource>
  );
}
