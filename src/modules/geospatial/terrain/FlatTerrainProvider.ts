import {type TerrainProvider} from './types';
import {type GeoPoint} from '../../../core/types/geo';

/**
 * Baseline provider: sea-level elevation everywhere until a DEM-backed
 * implementation is wired.
 */
export class FlatTerrainProvider implements TerrainProvider {
  readonly id = 'flat';

  async sampleElevationsMsl(
    points: readonly GeoPoint[],
  ): Promise<readonly number[]> {
    return points.map(() => 0);
  }
}

export const defaultTerrainProvider = new FlatTerrainProvider();
