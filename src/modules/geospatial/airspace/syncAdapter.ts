import {type AirspaceFeatureCollection} from './geojsonTypes';

/**
 * Pluggable sync seam for regulatory / exercise vector feeds (REST, S3,
 * partner APIs). MVP uses bundled GeoJSON + {@link AirspaceStore} overrides.
 */
export interface AirspaceSyncAdapter {
  readonly id: string;
  /** Fetch the latest feature collection for the active jurisdiction / bbox. */
  fetchLatest(signal?: AbortSignal): Promise<AirspaceFeatureCollection>;
}
