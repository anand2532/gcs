/**
 * Persisted catalog of offline regions (MMKV). Tracks intent separate from
 * native OfflineManager packs so operators can label operational zones.
 */

import {type OfflineRegionRecord} from './types';
import {log} from '../../../core/logger/Logger';
import {storage} from '../../persistence/storage';

const KEY = 'geospatial.region.catalog.v1';

export const RegionCatalog = {
  load(): readonly OfflineRegionRecord[] {
    const raw = storage.getRaw(KEY);
    if (!raw) {
      return [];
    }
    try {
      const parsed = JSON.parse(raw) as OfflineRegionRecord[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  save(records: readonly OfflineRegionRecord[]): void {
    try {
      storage.setRaw(KEY, JSON.stringify(records));
    } catch (err) {
      log.store.warn('regionCatalog.save failed', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  },

  upsert(record: OfflineRegionRecord): void {
    const list = [...RegionCatalog.load()].filter(r => r.id !== record.id);
    list.push(record);
    RegionCatalog.save(list);
  },

  remove(id: string): void {
    RegionCatalog.save(RegionCatalog.load().filter(r => r.id !== id));
  },
};
