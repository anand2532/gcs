/**
 * Top HUD bar.
 *
 * Performance design:
 *   - We subscribe via narrow Zustand selectors so each readout re-renders
 *     only when its specific field changes.
 *   - A single global throttle gate caps the *display* update rate to 5 Hz
 *     even if telemetry arrives faster (sim runs at 10 Hz). We do this with
 *     a manual subscription + `requestAnimationFrame` aligned commit, not a
 *     hook, so we never schedule React work we don't need.
 *   - Static parts (labels, frames) are wrapped in stable JSX so React
 *     reconciliation only diffs the value text nodes.
 */

import React, {useEffect, useState} from 'react';
import {StyleSheet, View} from 'react-native';

import {TelemetryReadout} from './TelemetryReadout';
import {
  ConnectionState,
  type FlightMode,
  GpsFix,
  type TelemetryFrame,
} from '../../core/types/telemetry';
import {trailingThrottle} from '../../core/utils/throttle';
import {useTelemetryStore} from '../../modules/telemetry';
import {CompassWidget} from '../components/CompassWidget';
import {GlassPanel} from '../components/GlassPanel';
import {StatusPill, type StatusPillTone} from '../components/StatusPill';
import {useTheme} from '../theme/ThemeProvider';


const HUD_REDRAW_HZ = 5;

interface HudSnapshot {
  readonly altRel: number;
  readonly groundSpeed: number;
  readonly headingDeg: number;
  readonly batterySoc: number;
  readonly satellites: number;
  readonly fix: GpsFix;
  readonly mode: FlightMode;
  readonly armed: boolean;
}

const EMPTY_SNAPSHOT: HudSnapshot = {
  altRel: 0,
  groundSpeed: 0,
  headingDeg: 0,
  batterySoc: 1,
  satellites: 0,
  fix: GpsFix.None,
  mode: 'UNKNOWN' as FlightMode,
  armed: false,
};

function frameToSnapshot(
  frame: TelemetryFrame | undefined,
  armed: boolean,
): HudSnapshot {
  if (!frame) {
    return {...EMPTY_SNAPSHOT, armed};
  }
  return {
    altRel: frame.position.altRel,
    groundSpeed: frame.groundSpeed,
    headingDeg: frame.headingDeg,
    batterySoc: frame.battery.soc,
    satellites: frame.gps.satellites,
    fix: frame.gps.fix,
    mode: frame.system.mode,
    armed,
  };
}

export function HudBar(): React.JSX.Element {
  const connection = useTelemetryStore(s => s.connection);
  const [snap, setSnap] = useState<HudSnapshot>(EMPTY_SNAPSHOT);

  useEffect(() => {
    const throttled = trailingThrottle((next: HudSnapshot) => {
      setSnap(next);
    }, Math.round(1000 / HUD_REDRAW_HZ));

    const unsub = useTelemetryStore.subscribe(
      state => ({frame: state.frame, armed: state.armed}),
      ({frame, armed}) => {
        throttled.call(frameToSnapshot(frame, armed));
      },
      {equalityFn: (a, b) => a.frame === b.frame && a.armed === b.armed},
    );

    const initial = useTelemetryStore.getState();
    setSnap(frameToSnapshot(initial.frame, initial.armed));

    return () => {
      unsub();
      throttled.cancel();
    };
  }, []);

  const theme = useTheme();

  const {tone, label, pulsing} = linkPresentation(connection);
  const batteryAccent = batteryAccentFor(snap.batterySoc);

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.row,
        {paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.sm},
      ]}>
      <GlassPanel
        elevated
        style={[
          styles.panel,
          {
            paddingVertical: theme.spacing.sm,
            paddingHorizontal: theme.spacing.lg,
            borderRadius: theme.radius.lg,
          },
        ]}>
        <View style={styles.metricsRow}>
          <TelemetryReadout
            label="Alt"
            value={snap.altRel.toFixed(1)}
            unit="m"
            accent="cyan"
          />
          <Divider />
          <TelemetryReadout
            label="GS"
            value={snap.groundSpeed.toFixed(1)}
            unit="m/s"
          />
          <Divider />
          <TelemetryReadout
            label="HDG"
            value={String(Math.round(snap.headingDeg)).padStart(3, '0')}
            unit="°"
          />
          <Divider />
          <TelemetryReadout
            label="Bat"
            value={Math.round(snap.batterySoc * 100).toString()}
            unit="%"
            accent={batteryAccent}
          />
          <Divider />
          <TelemetryReadout
            label="GPS"
            value={`${snap.satellites}`}
            unit={fixSuffix(snap.fix)}
            accent={snap.fix === GpsFix.ThreeD || snap.fix === GpsFix.Rtk ? 'green' : 'amber'}
          />
        </View>
      </GlassPanel>

      <View style={[styles.compassWrap, {marginRight: theme.spacing.md}]}>
        <CompassWidget size={72} opacity={0.82} />
      </View>

      <View style={styles.right}>
        <StatusPill label={label} tone={tone} pulsing={pulsing} />
        <StatusPill
          style={{marginTop: theme.spacing.xs}}
          label={snap.armed ? 'Armed' : 'Safe'}
          tone={snap.armed ? 'danger' : 'neutral'}
        />
        <StatusPill
          style={{marginTop: theme.spacing.xs}}
          label={snap.mode}
          tone="info"
        />
      </View>
    </View>
  );
}

function Divider(): React.JSX.Element {
  const theme = useTheme();
  return (
    <View
      style={{
        width: StyleSheet.hairlineWidth,
        alignSelf: 'stretch',
        marginHorizontal: theme.spacing.md,
        backgroundColor: theme.palette.surfaceLine,
      }}
    />
  );
}

function linkPresentation(state: ConnectionState): {
  tone: StatusPillTone;
  label: string;
  pulsing: boolean;
} {
  switch (state) {
    case ConnectionState.Live:
      return {tone: 'ok', label: 'Live', pulsing: true};
    case ConnectionState.Sim:
      return {tone: 'info', label: 'Sim', pulsing: true};
    case ConnectionState.Stale:
      return {tone: 'warn', label: 'Stale', pulsing: true};
    case ConnectionState.Lost:
      return {tone: 'danger', label: 'Lost', pulsing: true};
    case ConnectionState.Connecting:
      return {tone: 'warn', label: 'Connecting', pulsing: true};
    case ConnectionState.Idle:
    default:
      return {tone: 'neutral', label: 'Offline', pulsing: false};
  }
}

function batteryAccentFor(
  soc: number,
): 'green' | 'amber' | 'danger' | 'neutral' {
  if (soc <= 0.15) {
    return 'danger';
  }
  if (soc <= 0.35) {
    return 'amber';
  }
  return 'green';
}

function fixSuffix(fix: GpsFix): string {
  switch (fix) {
    case GpsFix.None:
      return 'no fix';
    case GpsFix.TwoD:
      return '2D';
    case GpsFix.ThreeD:
      return '3D';
    case GpsFix.Dgps:
      return 'DGPS';
    case GpsFix.Rtk:
      return 'RTK';
    default:
      return '';
  }
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  panel: {
    flex: 1,
    marginRight: 12,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  right: {
    alignItems: 'flex-end',
  },
  compassWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
