/**
 * Versioned persistence schemas. Bump the schema version whenever the shape
 * changes; older records are silently dropped (storage.getVersioned returns
 * undefined). UI must always tolerate missing values and fall back to
 * compile-time defaults.
 */

import {storage} from './storage';
import {type MapStyleVariant} from '../../core/constants/map';
import {SIM_DEFAULTS} from '../../core/constants/sim';
import {type MapCameraState} from '../../core/types/geo';
import {type PlannedMissionDraft} from '../../core/types/missionPlanning';


export const StorageKeys = {
  // Bumped to v2 in Phase 1 finalisation — the home location moved from the
  // bay-area placeholder to New Delhi (India Gate). Old persisted records
  // would otherwise pin the camera over California on first launch.
  MapCamera: 'map.camera.v2',
  MapFollow: 'map.follow.v1',
  /** Key bumped when MAP_VARIANT_VERSION became 2 so legacy v1 blobs are not re-keyed every launch. */
  MapVariant: 'map.variant.v2',
  SimConfig: 'sim.config.v1',
  MissionPlanningDraft: 'mission.planning.draft.v1',
  MissionPlanningUi: 'mission.planning.ui.v1',
  LinkProfile: 'telemetry.link.profile.v1',
} as const;

export const MAP_CAMERA_VERSION = 2;
export const MAP_FOLLOW_VERSION = 1;
export const MAP_VARIANT_VERSION = 2;
export const SIM_CONFIG_VERSION = 1;
export const MISSION_PLANNING_DRAFT_VERSION = 1;
export const MISSION_PLANNING_UI_VERSION = 1;
export const LINK_PROFILE_VERSION = 1;

export interface PersistedSimConfig {
  readonly tickHz: number;
  readonly cruiseSpeed: number;
  readonly cruiseAltMetres: number;
}

export const SimConfigStore = {
  load(): PersistedSimConfig {
    const stored = storage.getVersioned<PersistedSimConfig>(
      StorageKeys.SimConfig,
      SIM_CONFIG_VERSION,
    );
    return (
      stored ?? {
        tickHz: SIM_DEFAULTS.tickHz,
        cruiseSpeed: SIM_DEFAULTS.cruiseSpeed,
        cruiseAltMetres: SIM_DEFAULTS.cruiseAltMetres,
      }
    );
  },
  save(cfg: PersistedSimConfig): void {
    storage.setVersioned(StorageKeys.SimConfig, SIM_CONFIG_VERSION, cfg);
  },
};

export const MapCameraStore = {
  load(): MapCameraState | undefined {
    return storage.getVersioned<MapCameraState>(
      StorageKeys.MapCamera,
      MAP_CAMERA_VERSION,
    );
  },
  save(camera: MapCameraState): void {
    storage.setVersioned(StorageKeys.MapCamera, MAP_CAMERA_VERSION, camera);
  },
};

export interface PersistedFollow {
  readonly followDrone: boolean;
}

export const MapFollowStore = {
  load(): boolean {
    const v = storage.getVersioned<PersistedFollow>(
      StorageKeys.MapFollow,
      MAP_FOLLOW_VERSION,
    );
    return v?.followDrone ?? true;
  },
  save(followDrone: boolean): void {
    storage.setVersioned(StorageKeys.MapFollow, MAP_FOLLOW_VERSION, {
      followDrone,
    });
  },
};

export interface PersistedMapVariant {
  readonly variant: MapStyleVariant;
}

export const MapVariantStore = {
  load(): MapStyleVariant {
    const v = storage.getVersioned<PersistedMapVariant>(
      StorageKeys.MapVariant,
      MAP_VARIANT_VERSION,
    );
    return v?.variant ?? 'satellite';
  },
  save(variant: MapStyleVariant): void {
    storage.setVersioned(StorageKeys.MapVariant, MAP_VARIANT_VERSION, {
      variant,
    });
  },
};

export const MissionPlanningDraftStore = {
  load(): PlannedMissionDraft | undefined {
    return storage.getVersioned<PlannedMissionDraft>(
      StorageKeys.MissionPlanningDraft,
      MISSION_PLANNING_DRAFT_VERSION,
    );
  },
  save(draft: PlannedMissionDraft): void {
    storage.setVersioned(
      StorageKeys.MissionPlanningDraft,
      MISSION_PLANNING_DRAFT_VERSION,
      draft,
    );
  },
  clear(): void {
    storage.remove(StorageKeys.MissionPlanningDraft);
  },
};

export interface PersistedMissionPlanningUi {
  readonly minimized: boolean;
  readonly placementMode: 'none' | 'takeoff' | 'landing';
}

export const MissionPlanningUiStore = {
  load(): PersistedMissionPlanningUi | undefined {
    return storage.getVersioned<PersistedMissionPlanningUi>(
      StorageKeys.MissionPlanningUi,
      MISSION_PLANNING_UI_VERSION,
    );
  },
  save(data: PersistedMissionPlanningUi): void {
    storage.setVersioned(
      StorageKeys.MissionPlanningUi,
      MISSION_PLANNING_UI_VERSION,
      data,
    );
  },
};

export type TelemetryLinkProfileKind = 'simulation' | 'mavlink_udp';

export interface PersistedLinkProfile {
  readonly profile: TelemetryLinkProfileKind;
  /** Local UDP port bound for MAVLink ingress (default SITL-style 14550). */
  readonly udpBindPort: number;
}

export const LinkProfileStore = {
  load(): PersistedLinkProfile {
    const stored = storage.getVersioned<PersistedLinkProfile>(
      StorageKeys.LinkProfile,
      LINK_PROFILE_VERSION,
    );
    return (
      stored ?? {
        profile: 'simulation',
        udpBindPort: 14550,
      }
    );
  },
  save(profile: PersistedLinkProfile): void {
    storage.setVersioned(StorageKeys.LinkProfile, LINK_PROFILE_VERSION, profile);
  },
};
