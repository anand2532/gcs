export {validateMissionOperational} from './safety-validation';
export {
  RegionCatalog,
  offlineDownloadQueue,
  OfflineDownloadQueue,
  resolveEffectiveBasemap,
  pointInBounds,
  type BasemapResolution,
  type OfflineRegionRecord,
  type OfflineDownloadJob,
  type OfflineRegionStatus,
} from './offline-maps';
export {
  GeofenceEngine,
  geofenceEngine,
  bindGeofenceTelemetryEvaluation,
  GeofenceZoneKind,
  type GeofenceZone,
  type PolygonZone,
  type CircleZone,
  type AltitudeCylinderZone,
  type GeofenceViolation,
} from './geofence';
export {
  AirspaceStore,
  SAMPLE_RESTRICTED_AIRSPACE_GEOJSON,
  pointInRestrictedAirspace,
  polygonCentroid,
  type AirspaceSyncAdapter,
} from './airspace';
export {type TerrainProvider} from './terrain/types';
export {
  FlatTerrainProvider,
  defaultTerrainProvider,
} from './terrain/FlatTerrainProvider';
export {MapOverlayRegistry, globalOverlayRegistry} from './map-rendering';
export {
  MAP_CACHE_TILE_LIMIT,
  MAP_AMBIENT_CACHE_BYTES,
  MAP_PREFETCH_ZOOM_DELTA,
  CACHE_EVICTION_PRIORITY,
} from './tile-cache/policies';
export {useOperationalBasemap} from './hooks/useOperationalBasemap';
export type {
  OperationalBasemapState,
  UseOperationalBasemapResult,
} from './hooks/useOperationalBasemap';
