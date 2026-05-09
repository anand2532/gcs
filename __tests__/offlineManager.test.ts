/**
 * OfflineMapManager contract tests.
 *
 * Covers the four invariants this seam must hold:
 *   1. Bounds are forwarded to MapLibre as `[NE, SW]`, exactly.
 *   2. Zoom range is forwarded verbatim (caller picks the levels).
 *   3. Invalid bounds are rejected before we touch the native side.
 *   4. Progress events are mapped to the public, MapLibre-free shape.
 *
 * The test uses the mock `OfflineManager` registered in `jest.setup.js`
 * which exposes `__emitProgress` / `__emitError` test helpers.
 */

import {beforeEach, describe, expect, it} from '@jest/globals';
import {OfflineManager} from '@maplibre/maplibre-react-native';

import {
  OfflineMapManager,
  OfflinePackState,
  buildPackName,
  type OfflinePackProgress,
} from '../src/modules/offline';

// Test helper surface added to the mock in jest.setup.js.
type MockedOfflineManager = typeof OfflineManager & {
  __emitProgress(name: string, partial: Record<string, unknown>): void;
  __emitError(name: string, message: string): void;
  __reset(): void;
};

const Mocked = OfflineManager as unknown as MockedOfflineManager;

const validBounds = {
  ne: [78.5, 17.5] as [number, number],
  sw: [78.4, 17.4] as [number, number],
};

const styleURL = 'asset://styles/gcs-satellite-style.json';

describe('OfflineMapManager.downloadVisibleArea', () => {
  beforeEach(() => {
    Mocked.__reset();
    (Mocked.createPack as jest.Mock).mockClear();
    (Mocked.setTileCountLimit as jest.Mock).mockClear();
  });

  it('initialises tile count limit on first use', async () => {
    const name = buildPackName('init');
    const promise = OfflineMapManager.downloadVisibleArea(
      {bounds: validBounds, minZoom: 12, maxZoom: 14, styleURL, name},
      () => {},
    );
    Mocked.__emitProgress(name, {state: 2, percentage: 100});
    await promise;
    expect(Mocked.setTileCountLimit).toHaveBeenCalled();
  });

  it('forwards bounds + zoom range verbatim to MapLibre', async () => {
    const name = buildPackName('forward');
    const promise = OfflineMapManager.downloadVisibleArea(
      {bounds: validBounds, minZoom: 12, maxZoom: 18, styleURL, name},
      () => {},
    );
    Mocked.__emitProgress(name, {state: 2, percentage: 100});
    await promise;
    const args = (Mocked.createPack as jest.Mock).mock.calls[0]![0] as {
      name: string;
      styleURL: string;
      bounds: [unknown, unknown];
      minZoom: number;
      maxZoom: number;
    };
    expect(args.bounds[0]).toEqual(validBounds.ne);
    expect(args.bounds[1]).toEqual(validBounds.sw);
    expect(args.minZoom).toBe(12);
    expect(args.maxZoom).toBe(18);
    expect(args.styleURL).toBe(styleURL);
  });

  it('streams progress events into the public shape', async () => {
    const name = buildPackName('progress');
    const seen: OfflinePackProgress[] = [];
    const promise = OfflineMapManager.downloadVisibleArea(
      {bounds: validBounds, minZoom: 12, maxZoom: 14, styleURL, name},
      p => seen.push(p),
    );
    Mocked.__emitProgress(name, {
      state: 1,
      percentage: 25,
      requiredResourceCount: 100,
      completedResourceCount: 25,
      completedTileCount: 20,
      completedTileSize: 200_000,
    });
    Mocked.__emitProgress(name, {state: 2, percentage: 100});
    await promise;
    expect(seen.length).toBeGreaterThanOrEqual(2);
    // The mock emits an initial Active@0% snapshot synchronously from
    // createPack — pick the first non-zero Active event to assert the
    // percent-to-fraction mapping.
    const mid = seen.find(
      p => p.state === OfflinePackState.Active && p.progress > 0,
    );
    expect(mid).toBeDefined();
    expect(mid!.progress).toBeGreaterThan(0);
    expect(mid!.progress).toBeLessThanOrEqual(1);
    expect(mid!.completedTileCount).toBe(20);
    const last = seen[seen.length - 1]!;
    expect(last.state).toBe(OfflinePackState.Complete);
  });

  it('rejects an invalid bounds box', async () => {
    await expect(
      OfflineMapManager.downloadVisibleArea(
        {
          bounds: {ne: [10, 10], sw: [11, 11]}, // SW above NE — bogus
          minZoom: 12,
          maxZoom: 14,
          styleURL,
          name: buildPackName('bad-bounds'),
        },
        () => {},
      ),
    ).rejects.toThrow(/invalid bounds/);
  });

  it('rejects an invalid zoom range', async () => {
    await expect(
      OfflineMapManager.downloadVisibleArea(
        {
          bounds: validBounds,
          minZoom: 18,
          maxZoom: 12,
          styleURL,
          name: buildPackName('bad-zoom'),
        },
        () => {},
      ),
    ).rejects.toThrow(/invalid zoom range/);
  });

  it('rejects when a missing styleURL is passed', async () => {
    await expect(
      OfflineMapManager.downloadVisibleArea(
        {
          bounds: validBounds,
          minZoom: 12,
          maxZoom: 14,
          styleURL: '',
          name: buildPackName('no-style'),
        },
        () => {},
      ),
    ).rejects.toThrow(/styleURL required/);
  });

  it('routes a native error to the error listener and rejects', async () => {
    const name = buildPackName('error');
    const errors: string[] = [];
    const promise = OfflineMapManager.downloadVisibleArea(
      {bounds: validBounds, minZoom: 12, maxZoom: 14, styleURL, name},
      () => {},
      err => errors.push(err.message),
    );
    Mocked.__emitError(name, 'simulated failure');
    await expect(promise).rejects.toThrow(/simulated failure/);
    expect(errors).toContain('simulated failure');
  });

  it('lists previously-created packs by metadata name', async () => {
    const name = buildPackName('list');
    const promise = OfflineMapManager.downloadVisibleArea(
      {bounds: validBounds, minZoom: 12, maxZoom: 14, styleURL, name},
      () => {},
    );
    Mocked.__emitProgress(name, {state: 2, percentage: 100});
    await promise;
    const list = await OfflineMapManager.list();
    expect(list.find(p => p.name === name)).toBeDefined();
  });

  it('deletes a registered pack', async () => {
    const name = buildPackName('delete');
    const promise = OfflineMapManager.downloadVisibleArea(
      {bounds: validBounds, minZoom: 12, maxZoom: 14, styleURL, name},
      () => {},
    );
    Mocked.__emitProgress(name, {state: 2, percentage: 100});
    await promise;
    await OfflineMapManager.delete(name);
    const list = await OfflineMapManager.list();
    expect(list.find(p => p.name === name)).toBeUndefined();
  });
});
