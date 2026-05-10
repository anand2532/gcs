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
  /**
   * Full merged GeoJSON for **mission validation** (bundled sample + optional MMKV override).
   * The bundled sample is illustration data only — it must participate in checks/tests.
   */
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

  /**
   * GeoJSON for **map overlay only** — optional MMKV override features only.
   * Bundled demo polygons are intentionally excluded so the demo advisory zone does not paint a large red fill on the map (validation still uses {@link getActiveGeoJson}).
   */
  getMapOverlayGeoJson(): AirspaceFeatureCollection {
    const custom = storage.getRaw(KEY);
    if (!custom) {
      return {type: 'FeatureCollection', features: []};
    }
    const extra = parseFc(custom);
    return extra ?? {type: 'FeatureCollection', features: []};
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
