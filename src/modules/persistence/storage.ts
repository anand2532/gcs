/**
 * Persistence singleton.
 *
 * MMKV is synchronous, fast (~30x AsyncStorage), and crucial for first-paint
 * rehydration: we read the camera and sim config inline before MapHomeScreen
 * mounts, so users never see a frame at the wrong location.
 *
 * All values are JSON-serialized through versioned schemas (see schemas.ts)
 * so we can evolve formats without bricking installs.
 */

import {MMKV} from 'react-native-mmkv';

import {log} from '../../core/logger/Logger';

const mmkv = new MMKV({id: 'gcs.app.v1'});

export interface VersionedRecord<T> {
  readonly v: number;
  readonly data: T;
}

export const storage = {
  setRaw(key: string, value: string): void {
    mmkv.set(key, value);
  },

  getRaw(key: string): string | undefined {
    return mmkv.getString(key);
  },

  remove(key: string): void {
    mmkv.delete(key);
  },

  has(key: string): boolean {
    return mmkv.contains(key);
  },

  setVersioned<T>(key: string, version: number, data: T): void {
    try {
      const record: VersionedRecord<T> = {v: version, data};
      mmkv.set(key, JSON.stringify(record));
    } catch (err) {
      log.store.warn('failed to persist', {
        key,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  },

  getVersioned<T>(key: string, expectedVersion: number): T | undefined {
    const raw = mmkv.getString(key);
    if (!raw) {
      return undefined;
    }
    try {
      const parsed = JSON.parse(raw) as VersionedRecord<T>;
      if (parsed.v !== expectedVersion) {
        log.store.info('schema version mismatch — discarding', {
          key,
          got: parsed.v,
          expected: expectedVersion,
        });
        return undefined;
      }
      return parsed.data;
    } catch (err) {
      log.store.warn('failed to parse persisted value', {
        key,
        error: err instanceof Error ? err.message : String(err),
      });
      return undefined;
    }
  },

  clearAll(): void {
    mmkv.clearAll();
  },
} as const;
