/**
 * Camera & follow-state persistence tests.
 *
 * Validates the round-trip contract for the three new persisted records:
 *   - `MapCameraStore`   : pose snapshot
 *   - `MapFollowStore`   : pilot's "follow drone" preference
 *   - `MapVariantStore`  : satellite vs hybrid choice
 *
 * Also pins the schema-version-mismatch and corrupted-JSON behaviour:
 *   * mismatch -> `undefined` / safe default (does NOT throw).
 *   * garbage  -> `undefined` / safe default (does NOT throw).
 */

import {beforeEach, describe, expect, it} from '@jest/globals';

import {
  MAP_CAMERA_VERSION,
  MAP_FOLLOW_VERSION,
  MAP_VARIANT_VERSION,
  MapCameraStore,
  MapFollowStore,
  MapVariantStore,
  StorageKeys,
} from '../src/modules/persistence/schemas';
import {storage} from '../src/modules/persistence/storage';

describe('map persistence', () => {
  beforeEach(() => {
    storage.clearAll();
  });

  it('round-trips a camera pose', () => {
    const pose = {
      center: {lat: 37.4275, lon: -122.1697},
      zoom: 17.5,
      bearing: 30,
      pitch: 45,
    };
    MapCameraStore.save(pose);
    expect(MapCameraStore.load()).toEqual(pose);
  });

  it('returns undefined when the camera record is missing', () => {
    expect(MapCameraStore.load()).toBeUndefined();
  });

  it('discards a camera record with a mismatched schema version', () => {
    const stale = JSON.stringify({
      v: MAP_CAMERA_VERSION + 99,
      data: {center: {lat: 1, lon: 1}, zoom: 1, bearing: 0, pitch: 0},
    });
    storage.setRaw(StorageKeys.MapCamera, stale);
    expect(MapCameraStore.load()).toBeUndefined();
  });

  it('discards a corrupted (non-JSON) camera record', () => {
    storage.setRaw(StorageKeys.MapCamera, '{not-valid-json');
    expect(MapCameraStore.load()).toBeUndefined();
  });

  it('round-trips the follow-drone toggle', () => {
    expect(MapFollowStore.load()).toBe(true); // default when absent
    MapFollowStore.save(false);
    expect(MapFollowStore.load()).toBe(false);
    MapFollowStore.save(true);
    expect(MapFollowStore.load()).toBe(true);
  });

  it('falls back to follow=true when the persisted record is bogus', () => {
    storage.setRaw(StorageKeys.MapFollow, '\u0000not-json');
    expect(MapFollowStore.load()).toBe(true);
  });

  it('round-trips the satellite/hybrid variant', () => {
    expect(MapVariantStore.load()).toBe('satellite');
    MapVariantStore.save('hybrid');
    expect(MapVariantStore.load()).toBe('hybrid');
    MapVariantStore.save('satellite');
    expect(MapVariantStore.load()).toBe('satellite');
  });

  it('discards a variant record with a wrong schema version', () => {
    const stale = JSON.stringify({
      v: MAP_VARIANT_VERSION + 99,
      data: {variant: 'hybrid'},
    });
    storage.setRaw(StorageKeys.MapVariant, stale);
    expect(MapVariantStore.load()).toBe('satellite');
  });

  it('keeps the follow record at the right schema version on save', () => {
    MapFollowStore.save(false);
    const raw = storage.getRaw(StorageKeys.MapFollow);
    expect(raw).toBeDefined();
    const parsed = JSON.parse(raw!) as {v: number; data: {followDrone: boolean}};
    expect(parsed.v).toBe(MAP_FOLLOW_VERSION);
    expect(parsed.data.followDrone).toBe(false);
  });
});
