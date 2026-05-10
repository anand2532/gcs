/**
 * Simulation engine.
 *
 * Implements the {@link TelemetrySource} contract — the same contract real
 * MAVLink/MQTT will implement later. From the UI's perspective, it is
 * indistinguishable from a real link except via the `source` field on each
 * frame.
 *
 * Loop strategy:
 *   - We use `setInterval` aligned to 1000/tickHz ms rather than
 *     `requestAnimationFrame`, because:
 *       (a) telemetry rate must be deterministic, not display-tied;
 *       (b) iOS/Android may pause rAF when the screen blanks while the JS
 *           runtime keeps going — we want the sim to behave like a real
 *           link, which keeps publishing.
 *   - We compute `dt` from a wall-clock timestamp delta (with a sane cap)
 *     so a paused JS thread doesn't teleport the model on resume.
 *   - The runner steps once per tick; the model snapshot is converted to a
 *     full `TelemetryFrame` and published on the bus.
 */

import {FlightModel} from './FlightModel';
import {buildSampleMissions, MissionRunner} from './MissionRunner';
import {
  type MissionPreset,
  type SimStateListener,
  type SimulationState,
  SimRunState,
} from './types';
import {SIM_MAX_PENDING_LATENCY_FRAMES} from '../../core/constants/sim';
import {log} from '../../core/logger/Logger';
import {type GeoPosition} from '../../core/types/geo';
import {type Mission, MissionPhase} from '../../core/types/mission';
import {
  ConnectionState,
  FlightMode,
  GpsFix,
  type TelemetryFrame,
  type TelemetrySource,
  TelemetrySourceKind,
} from '../../core/types/telemetry';
import {now} from '../../core/utils/time';
import {PRIMARY_TELEMETRY_VEHICLE_ID} from '../organization/fleetConstants';
import {SimConfigStore} from '../persistence/schemas';
import {telemetryBus} from '../telemetry/TelemetryBus';
import {useTelemetryStore} from '../telemetry/TelemetryStore';


/**
 * Default sim home pad — New Delhi (India Gate). The demo mission flies a
 * ~120 m box around this point. AltMsl is the approximate ground elevation
 * at this location (Delhi sits ~216 m above mean sea level).
 */
const DEFAULT_HOME: GeoPosition = {
  lat: 28.6129,
  lon: 77.2295,
  altMsl: 216,
  altRel: 0,
};

const TICK_DT_CAP_SEC = 0.25;

interface SimEngineOptions {
  readonly home?: GeoPosition;
  readonly tickHz?: number;
}

interface LinkModelState {
  quality: number;
  dropRate: number;
  burstTicksLeft: number;
  recentDrops: number;
  recentSamples: number;
}

class SimulationEngineImpl implements TelemetrySource {
  readonly kind = TelemetrySourceKind.Simulation;

  private home: GeoPosition;
  private missions: Mission[];
  private selectedMissionPresetId: string;
  private mission: Mission;
  private flight: FlightModel;
  private runner: MissionRunner;

  private interval: ReturnType<typeof setInterval> | null = null;
  private state: SimRunState = SimRunState.Idle;
  private tickHz: number;
  private lastTickAt = 0;
  private elapsedMs = 0;
  private startedAt = 0;
  private readonly listeners = new Set<SimStateListener>();

  // Synthetic battery + gps state — gives the HUD something interesting.
  private batterySoc = 1.0;
  private gpsSatellites = 14;
  private gpsHdop = 0.7;
  private gpsFix: GpsFix = GpsFix.ThreeD;
  private linkModel: LinkModelState = {
    quality: 1,
    dropRate: 0,
    burstTicksLeft: 0,
    recentDrops: 0,
    recentSamples: 0,
  };
  private forceLinkOutage = false;
  private readonly pendingFrameTimers = new Set<ReturnType<typeof setTimeout>>();

  constructor(opts: SimEngineOptions = {}) {
    const persisted = SimConfigStore.load();
    this.tickHz = opts.tickHz ?? persisted.tickHz;
    this.home = opts.home ?? DEFAULT_HOME;
    this.missions = buildSampleMissions(this.home);
    const initialMission = this.missions[0] ?? buildSampleMissions(this.home)[0];
    if (!initialMission) {
      throw new Error('SimulationEngine: failed to build initial mission presets');
    }
    this.selectedMissionPresetId = initialMission.id;
    this.mission = initialMission;
    this.flight = new FlightModel(this.home, 0);
    this.runner = new MissionRunner(this.mission, this.flight);
  }

  start(): void {
    if (this.state === SimRunState.Running) {
      return;
    }
    if (this.state === SimRunState.Idle || this.state === SimRunState.Completed) {
      this.runner.reset();
      this.runner.start();
      this.elapsedMs = 0;
      this.startedAt = now();
      this.batterySoc = 1.0;
      this.resetSignalModels();
      useTelemetryStore.getState().startSession();
      useTelemetryStore.getState().setArmed(true);
    }
    this.state = SimRunState.Running;
    this.lastTickAt = now();
    const intervalMs = Math.max(16, Math.round(1000 / this.tickHz));
    this.clearInterval();
    this.interval = setInterval(() => {
      this.tick();
    }, intervalMs);
    log.sim.info('start', {tickHz: this.tickHz, intervalMs});
    this.notify();
  }

  pause(): void {
    if (this.state !== SimRunState.Running) {
      return;
    }
    this.state = SimRunState.Paused;
    this.clearInterval();
    this.clearPendingFrameTimers();
    log.sim.info('pause');
    this.notify();
  }

  resume(): void {
    if (this.state !== SimRunState.Paused) {
      return;
    }
    this.state = SimRunState.Running;
    this.lastTickAt = now();
    const intervalMs = Math.max(16, Math.round(1000 / this.tickHz));
    this.clearInterval();
    this.interval = setInterval(() => {
      this.tick();
    }, intervalMs);
    log.sim.info('resume');
    this.notify();
  }

  reset(): void {
    this.clearInterval();
    this.runner.reset();
    this.state = SimRunState.Idle;
    this.elapsedMs = 0;
    this.batterySoc = 1.0;
    this.clearPendingFrameTimers();
    this.resetSignalModels();
    useTelemetryStore.getState().setArmed(false);
    useTelemetryStore.getState().endSession();
    useTelemetryStore.getState().setConnection(ConnectionState.Idle);
    log.sim.info('reset');
    this.notify();
  }

  stop(): void {
    this.reset();
  }

  isRunning(): boolean {
    return this.state === SimRunState.Running;
  }

  getState(): SimulationState {
    return {
      run: this.state,
      mission: this.mission,
      progress: this.runner.progress(),
      elapsedMs: this.elapsedMs,
      selectedMissionPresetId: this.selectedMissionPresetId,
    };
  }

  subscribe(listener: SimStateListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  setTickHz(hz: number): void {
    this.tickHz = Math.max(1, Math.min(60, hz));
    if (this.state === SimRunState.Running) {
      this.clearInterval();
      const intervalMs = Math.max(16, Math.round(1000 / this.tickHz));
      this.interval = setInterval(() => {
        this.tick();
      }, intervalMs);
    }
  }

  listMissionPresets(): MissionPreset[] {
    return this.missions.map(m => ({id: m.id, name: m.name}));
  }

  loadMissionPreset(id: string): void {
    const selected = this.missions.find(m => m.id === id);
    if (!selected) {
      return;
    }
    const wasRunning = this.state === SimRunState.Running;
    this.clearInterval();
    this.clearPendingFrameTimers();
    this.mission = selected;
    this.selectedMissionPresetId = selected.id;
    this.flight = new FlightModel(this.home, 0);
    this.runner = new MissionRunner(this.mission, this.flight);
    this.state = SimRunState.Idle;
    this.elapsedMs = 0;
    this.batterySoc = 1.0;
    this.resetSignalModels();
    if (wasRunning) {
      this.start();
      return;
    }
    this.notify();
    log.sim.info('mission.preset.loaded', {id});
  }

  loadMission(mission: Mission): void {
    const wasRunning = this.state === SimRunState.Running;
    this.clearInterval();
    this.mission = mission;
    this.selectedMissionPresetId = mission.id;
    this.flight = new FlightModel(mission.home, 0);
    this.runner = new MissionRunner(this.mission, this.flight);
    this.state = SimRunState.Idle;
    this.elapsedMs = 0;
    this.batterySoc = 1.0;
    this.clearPendingFrameTimers();
    this.resetSignalModels();
    if (wasRunning) {
      this.start();
      return;
    }
    this.notify();
    log.sim.info('mission.loaded.runtime', {id: mission.id});
  }

  loadNextMissionPreset(): void {
    if (this.missions.length === 0) {
      return;
    }
    const idx = this.missions.findIndex(m => m.id === this.selectedMissionPresetId);
    const next = this.missions[(idx + 1) % this.missions.length];
    if (!next) {
      return;
    }
    this.loadMissionPreset(next.id);
  }

  setForceLinkOutage(enabled: boolean): void {
    this.forceLinkOutage = enabled;
    if (!enabled) {
      this.linkModel.burstTicksLeft = 0;
    }
  }

  private clearInterval(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  private clearPendingFrameTimers(): void {
    this.pendingFrameTimers.forEach(timer => {
      clearTimeout(timer);
    });
    this.pendingFrameTimers.clear();
  }

  private tick(): void {
    const t = now();
    const rawDt = (t - this.lastTickAt) / 1000;
    const dt = Math.min(TICK_DT_CAP_SEC, Math.max(0.001, rawDt));
    this.lastTickAt = t;
    this.elapsedMs = t - this.startedAt;

    this.runner.step(dt);
    const snap = this.flight.snapshot();
    this.updateLinkModel(dt);
    // Synthetic drops must not suppress the terminal tick: `MissionRunner` can move to
    // `Complete` on this same `step()`, but `shouldDropCurrentFrame()` would return early
    // and skip the completion block — leaving `SimRunState.Running` with the interval
    // still armed (infinite no-op ticks). Burst RF loss at the landing waypoint was the
    // real failure mode; completion is authoritative, not subject to link modeling.
    const completingRun =
      this.runner.isComplete() && this.state === SimRunState.Running;
    if (!completingRun && this.shouldDropCurrentFrame()) {
      return;
    }
    this.updateGpsModel(dt);
    const phase = this.runner.progress().phase;
    this.applyBatteryDrain(dt, snap.groundSpeed, snap.climbSpeed, phase);
    const latencyMs = this.simulatedLatencyMs();

    const publishFrame = (): void => {
      if (this.state !== SimRunState.Running) {
        return;
      }
      if (
        !Number.isFinite(snap.position.lat) ||
        !Number.isFinite(snap.position.lon)
      ) {
        return;
      }
      const publishAt = now();
      const frame: TelemetryFrame = {
        t: publishAt,
        vehicleId: PRIMARY_TELEMETRY_VEHICLE_ID,
        source: TelemetrySourceKind.Simulation,
        position: snap.position,
        velocity: snap.velocity,
        headingDeg: snap.headingDeg,
        groundSpeed: snap.groundSpeed,
        climbSpeed: snap.climbSpeed,
        attitude: {roll: 0, pitch: 0, yaw: (snap.headingDeg * Math.PI) / 180},
        battery: {
          soc: this.batterySoc,
          voltage: 10.8 + this.batterySoc * 2.0 - Math.min(0.8, snap.groundSpeed * 0.03),
          currentAmps: 3 + snap.groundSpeed * 0.35 + Math.max(0, snap.climbSpeed) * 2.4,
        },
        gps: {
          fix: this.gpsFix,
          satellites: this.gpsSatellites,
          hdop: this.gpsHdop,
        },
        link: {
          quality: this.linkModel.quality,
          latencyMs,
          dropRate: this.linkModel.dropRate,
        },
        system: {
          mode: missionPhaseToFlightMode(this.runner.progress().phase),
          armed: useTelemetryStore.getState().armed,
        },
      };
      telemetryBus.publish(frame);
    };

    // Finish mission on this tick before scheduling latency for the same tick — otherwise we
    // schedule a timer then clearPendingFrameTimers() in complete cleanup and drop the final frame.
    if (this.runner.isComplete() && this.state === SimRunState.Running) {
      publishFrame();
      this.state = SimRunState.Completed;
      this.clearInterval();
      this.clearPendingFrameTimers();
      log.sim.info('complete');
      useTelemetryStore.getState().setArmed(false);
      this.notify();
      return;
    }

    if (latencyMs <= 0) {
      publishFrame();
    } else if (this.pendingFrameTimers.size >= SIM_MAX_PENDING_LATENCY_FRAMES) {
      log.sim.warn('latency.queue.shed', {
        pending: this.pendingFrameTimers.size,
        cap: SIM_MAX_PENDING_LATENCY_FRAMES,
      });
      publishFrame();
    } else {
      const timer = setTimeout(() => {
        this.pendingFrameTimers.delete(timer);
        publishFrame();
      }, latencyMs);
      this.pendingFrameTimers.add(timer);
    }
  }

  private notify(): void {
    const snap = this.getState();
    this.listeners.forEach(l => {
      try {
        l(snap);
      } catch (err) {
        log.sim.warn('listener threw', {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    });
  }

  private resetSignalModels(): void {
    this.gpsSatellites = 14;
    this.gpsHdop = 0.7;
    this.gpsFix = GpsFix.ThreeD;
    this.linkModel = {
      quality: 1,
      dropRate: 0,
      burstTicksLeft: 0,
      recentDrops: 0,
      recentSamples: 0,
    };
  }

  private updateGpsModel(dt: number): void {
    const tSec = this.elapsedMs / 1000;
    const baseSat = 14 - Math.floor(Math.max(0, (1 - this.batterySoc) * 4));
    const wobble = Math.round(Math.sin(tSec * 0.25) * 2);
    this.gpsSatellites = Math.max(6, Math.min(18, baseSat + wobble));
    const qualityPenalty = (1 - this.linkModel.quality) * 1.2;
    this.gpsHdop = Math.max(0.6, Math.min(3.5, 0.65 + qualityPenalty + Math.abs(Math.cos(tSec * 0.35)) * 0.22));
    if (this.gpsSatellites >= 14 && this.gpsHdop <= 0.9) {
      this.gpsFix = GpsFix.Rtk;
    } else if (this.gpsSatellites >= 10 && this.gpsHdop <= 1.6) {
      this.gpsFix = GpsFix.ThreeD;
    } else if (this.gpsSatellites >= 7) {
      this.gpsFix = GpsFix.TwoD;
    } else {
      this.gpsFix = GpsFix.None;
    }
    if (dt > 0.2) {
      this.gpsFix = GpsFix.Dgps;
    }
  }

  /**
   * Single battery drain path: propulsion/climb load plus a small mission-clock
   * overhead whenever the mission FSM is past IDLE (avoids double-counting the
   * legacy `updateBatteryModel` + post-publish drain).
   */
  private applyBatteryDrain(
    dt: number,
    groundSpeed: number,
    climbSpeed: number,
    missionPhase: MissionPhase,
  ): void {
    const flightLoad =
      0.002 + groundSpeed * 0.00006 + Math.max(0, climbSpeed) * 0.00015;
    let drainPerSec = flightLoad;
    if (missionPhase !== MissionPhase.Idle) {
      drainPerSec += 0.006 / 60;
    }
    this.batterySoc = Math.max(0, this.batterySoc - dt * drainPerSec);
  }

  private updateLinkModel(dt: number): void {
    if (this.forceLinkOutage) {
      this.linkModel.quality = 0.05;
      this.linkModel.burstTicksLeft = 8;
      return;
    }
    const tSec = this.elapsedMs / 1000;
    const baseQuality = 0.9 - (1 - this.batterySoc) * 0.2 + Math.sin(tSec * 0.17) * 0.08;
    if (this.linkModel.burstTicksLeft > 0) {
      this.linkModel.burstTicksLeft--;
      this.linkModel.quality = Math.max(0.08, baseQuality - 0.55);
    } else {
      this.linkModel.quality = Math.max(0.35, Math.min(1, baseQuality));
      const burstChance = dt * 0.08;
      if (Math.random() < burstChance) {
        this.linkModel.burstTicksLeft = 4 + Math.floor(Math.random() * 4);
      }
    }
  }

  private simulatedLatencyMs(): number {
    if (this.forceLinkOutage) {
      return 420;
    }
    const jitterMs = (1 - this.linkModel.quality) * 180;
    return Math.max(0, Math.round(45 + jitterMs * Math.random()));
  }

  private shouldDropCurrentFrame(): boolean {
    if (this.forceLinkOutage) {
      this.linkModel.recentSamples++;
      this.linkModel.recentDrops++;
      this.linkModel.dropRate = 1;
      return true;
    }
    const baseDropChance = (1 - this.linkModel.quality) * 0.22;
    const burstBoost = this.linkModel.burstTicksLeft > 0 ? 0.24 : 0;
    const drop = Math.random() < baseDropChance + burstBoost;
    this.linkModel.recentSamples++;
    if (drop) {
      this.linkModel.recentDrops++;
    }
    if (this.linkModel.recentSamples >= 40) {
      this.linkModel.dropRate = this.linkModel.recentDrops / this.linkModel.recentSamples;
      this.linkModel.recentDrops = 0;
      this.linkModel.recentSamples = 0;
    }
    return drop;
  }
}

function missionPhaseToFlightMode(phase: MissionPhase): FlightMode {
  switch (phase) {
    case MissionPhase.Idle:
      return FlightMode.Manual;
    case MissionPhase.Arming:
    case MissionPhase.Takeoff:
    case MissionPhase.EnRoute:
    case MissionPhase.Loitering:
      return FlightMode.Auto;
    case MissionPhase.Returning:
      return FlightMode.Rtl;
    case MissionPhase.Landing:
      return FlightMode.Land;
    case MissionPhase.Complete:
      return FlightMode.Manual;
    default:
      return FlightMode.Unknown;
  }
}

export const simulationEngine = new SimulationEngineImpl();
export type SimulationEngine = SimulationEngineImpl;
