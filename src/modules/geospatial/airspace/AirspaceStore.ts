import {type AirspaceFeatureCollection} from './geojsonTypes';
import {SAMPLE_RESTRICTED_AIRSPACE_GEOJSON} from './sampleRestrictedZones';
import {log} from '../../../core/logger/Logger';
import {storage} from '../../persistence/storage';

const KEY = 'geospatial.airspace.overlay.v1';

function parseFc(raw: string): AirspaceFeatureCollection | null {
  try {
    const j = JSON.parse(raw) as AirspaceFeatureCollection;
    if (j.type !== 'FeatureCollection' || !Array.isArray(j.features)) {
      return null;
    }
    return j;
  } catch {
    return null;
  }
}

/**
 * Local airspace vector cache + bundled demo layer merge.
 */
export const AirspaceStore = {
  /** Active GeoJSON for MapLibre ShapeSource (restricted demo + overrides). */
  getActiveGeoJson(): AirspaceFeatureCollection {
    const custom = storage.getRaw(KEY);
    const base =
      SAMPLE_RESTRICTED_AIRSPACE_GEOJSON as unknown as AirspaceFeatureCollection;
    if (!custom) {
      return base;
    }
    const extra = parseFc(custom);
    if (!extra) {
      return base;
    }
    return {
      type: 'FeatureCollection',
      features: [...base.features, ...extra.features],
    };
  },

  saveOverride(fc: AirspaceFeatureCollection): void {
    try {
      storage.setRaw(KEY, JSON.stringify(fc));
    } catch (err) {
      log.store.warn('airspace.saveOverride failed', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  },

  clearOverride(): void {
    storage.remove(KEY);
  },
};
