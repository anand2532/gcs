import {create} from 'zustand';

import {PRIMARY_TELEMETRY_VEHICLE_ID} from './fleetConstants';
import {GpsFix, type TelemetryFrame} from '../../core/types/telemetry';

export type FleetOperationalStatus =
  | 'ready'
  | 'airborne'
  | 'charging'
  | 'offline'
  | 'maintenance';

export interface FleetVehicle {
  readonly id: string;
  readonly displayName: string;
  readonly model: string;
  readonly group: string;
  status: FleetOperationalStatus;
  batterySoc: number;
  /** 0..1 uplink quality hint for UI. */
  signalStrength: number;
  gpsFixLabel: string;
  missionLabel: string | null;
  healthScore: number;
  lastSeenMs: number;
}

function gpsFixLabel(fix: (typeof GpsFix)[keyof typeof GpsFix]): string {
  switch (fix) {
    case GpsFix.ThreeD:
      return '3D';
    case GpsFix.TwoD:
      return '2D';
    case GpsFix.Rtk:
      return 'RTK';
    default:
      return '—';
  }
}

function seedFleet(): FleetVehicle[] {
  const groups = ['Alpha', 'Bravo', 'Charlie', 'Delta'];
  const models = ['HX-440', 'VX-120', 'MQ-Survey', 'RTK-Pro'];
  const out: FleetVehicle[] = [];
  for (let i = 0; i < 24; i++) {
    const n = i + 1;
    const group = groups[i % groups.length] ?? 'Alpha';
    const id =
      i === 0
        ? PRIMARY_TELEMETRY_VEHICLE_ID
        : `fleet-uav-${String(n).padStart(3, '0')}`;
    const status: FleetOperationalStatus =
      i % 7 === 0 ? 'charging' : i % 11 === 0 ? 'maintenance' : i % 5 === 0 ? 'offline' : 'ready';
    const model = models[i % models.length] ?? 'HX-440';
    out.push({
      id,
      displayName: `${group}-${String(n).padStart(2, '0')}`,
      model,
      group,
      status,
      batterySoc: 0.45 + (i % 10) * 0.05,
      signalStrength: status === 'offline' ? 0.15 : 0.55 + (i % 5) * 0.08,
      gpsFixLabel: status === 'offline' ? '—' : '3D',
      missionLabel: i % 4 === 0 ? 'Corridor survey' : i % 4 === 1 ? 'RTL standby' : null,
      healthScore: status === 'maintenance' ? 62 : 78 + (i % 15),
      lastSeenMs: Date.now() - (status === 'offline' ? 120_000 : i * 1000),
    });
  }
  return out;
}

interface FleetState {
  readonly vehicles: readonly FleetVehicle[];
  applyLiveFrame: (vehicleId: string, frame: TelemetryFrame) => void;
}

export const useFleetStore = create<FleetState>((set, get) => ({
  vehicles: seedFleet(),

  applyLiveFrame: (vehicleId, frame) => {
    const vehicles = get().vehicles;
    const idx = vehicles.findIndex(v => v.id === vehicleId);
    if (idx < 0) {
      return;
    }
    const prev = vehicles[idx];
    if (!prev) {
      return;
    }
    const next: FleetVehicle = {
      ...prev,
      batterySoc: frame.battery.soc,
      signalStrength: frame.link.quality,
      gpsFixLabel: gpsFixLabel(frame.gps.fix),
      lastSeenMs: frame.t,
      status:
        frame.groundSpeed > 1.5 && prev.status !== 'charging' && prev.status !== 'maintenance'
          ? 'airborne'
          : prev.status === 'offline'
            ? 'ready'
            : prev.status,
      missionLabel:
        frame.missionProgress !== undefined
          ? `WP ${frame.missionProgress.seq}/${Math.max(1, frame.missionProgress.total)}`
          : prev.missionLabel,
    };
    const nextList = vehicles.slice();
    nextList[idx] = next;
    set({vehicles: nextList});
  },
}));
