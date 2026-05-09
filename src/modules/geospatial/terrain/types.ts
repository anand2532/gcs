import {type GeoPoint} from '../../../core/types/geo';

export interface TerrainSample {
  readonly elevationMslM: number;
  readonly lat: number;
  readonly lon: number;
}

/** Pluggable terrain / DEM provider (offline batches + API behind same seam). */
export interface TerrainProvider {
  readonly id: string;
  /** Sample elevation at WGS84 locations (best-effort). */
  sampleElevationsMsl(points: readonly GeoPoint[]): Promise<readonly number[]>;
}
