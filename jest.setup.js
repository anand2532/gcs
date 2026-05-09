/* eslint-env jest */
// Silence Reanimated logger and provide a minimal mock for Jest.
jest.mock('react-native-reanimated', () =>

  require('react-native-reanimated/mock'),
);

// react-native-gesture-handler ships its own jest setup.

require('react-native-gesture-handler/jestSetup');

// MMKV native module mock.
jest.mock('react-native-mmkv', () => {
  class MMKV {
    constructor() {
      this.store = new Map();
    }
    set(key, value) {
      this.store.set(key, value);
    }
    getString(key) {
      const v = this.store.get(key);
      return typeof v === 'string' ? v : undefined;
    }
    getNumber(key) {
      const v = this.store.get(key);
      return typeof v === 'number' ? v : undefined;
    }
    getBoolean(key) {
      const v = this.store.get(key);
      return typeof v === 'boolean' ? v : undefined;
    }
    delete(key) {
      this.store.delete(key);
    }
    contains(key) {
      return this.store.has(key);
    }
    clearAll() {
      this.store.clear();
    }
  }
  return {MMKV};
});

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    addEventListener: (cb) => {
      cb({isConnected: true, isInternetReachable: true});
      return () => {};
    },
    fetch: () =>
      Promise.resolve({isConnected: true, isInternetReachable: true}),
  },
}));

// MapLibre is a native module — mock it for Jest. The mock surface mirrors
// the parts of `@maplibre/maplibre-react-native` the app touches, including
// the OfflineManager + OfflinePack singletons used for tile pre-fetch.
jest.mock('@maplibre/maplibre-react-native', () => {
  const noop = () => null;

  // Track packs so tests can introspect & resolve listeners synchronously.
  const __packs = new Map();
  const __listeners = new Map();
  const __progress = new Map();

  const STATE = {Inactive: 0, Active: 1, Complete: 2};

  const OfflineManager = {
    setTileCountLimit: jest.fn(),
    setMaximumAmbientCacheSize: jest.fn(async () => undefined),
    setProgressEventThrottle: jest.fn(),
    clearAmbientCache: jest.fn(async () => undefined),
    invalidateAmbientCache: jest.fn(async () => undefined),
    resetDatabase: jest.fn(async () => undefined),
    createPack: jest.fn(async (options, onProgress, onError) => {
      __packs.set(options.name, {options, onError});
      __listeners.set(options.name, onProgress);
      const initial = {
        name: options.name,
        state: STATE.Active,
        percentage: 0,
        completedResourceCount: 0,
        completedResourceSize: 0,
        completedTileCount: 0,
        completedTileSize: 0,
        requiredResourceCount: 0,
      };
      __progress.set(options.name, initial);
      onProgress({metadata: {name: options.name}}, initial);
      return {};
    }),
    deletePack: jest.fn(async name => {
      __packs.delete(name);
      __listeners.delete(name);
      __progress.delete(name);
    }),
    getPacks: jest.fn(async () =>
      Array.from(__packs.entries()).map(([name, p]) => ({
        name,
        bounds: p.options.bounds,
        metadata: {name, ...(p.options.metadata ?? {})},
      })),
    ),
    invalidatePack: jest.fn(async () => undefined),
    mergeOfflineRegions: jest.fn(async () => undefined),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
    /** Test helper — drive a progress event through the registered listener. */
    __emitProgress(name, partial) {
      const listener = __listeners.get(name);
      if (!listener) {
        return;
      }
      const merged = {
        ...(__progress.get(name) ?? {name, state: STATE.Active}),
        ...partial,
      };
      __progress.set(name, merged);
      listener({metadata: {name}}, merged);
    },
    __emitError(name, message) {
      const pack = __packs.get(name);
      pack?.onError?.({metadata: {name}}, {name, message});
    },
    __reset() {
      __packs.clear();
      __listeners.clear();
      __progress.clear();
    },
  };

  const OfflinePack = function OfflinePack() {};
  OfflinePack.prototype.status = jest.fn(async () => ({
    name: '',
    state: STATE.Inactive,
    percentage: 0,
    completedResourceCount: 0,
    completedResourceSize: 0,
    completedTileCount: 0,
    completedTileSize: 0,
    requiredResourceCount: 0,
  }));

  const OfflinePackDownloadState = {
    Inactive: STATE.Inactive,
    Active: STATE.Active,
    Complete: STATE.Complete,
  };

  // forwardRef-style component mocks for ref-bearing components (MapView/Camera).
  const React = require('react');
  const refStub = (impl = {}) =>
    React.forwardRef((_props, ref) => {
      React.useImperativeHandle(ref, () => impl, []);
      return null;
    });

  return {
    __esModule: true,
    default: {},
    MapView: refStub({
      getVisibleBounds: jest.fn(async () => [
        [10, 10],
        [9, 9],
      ]),
      getCenter: jest.fn(async () => [0, 0]),
      getZoom: jest.fn(async () => 12),
      takeSnap: jest.fn(async () => ''),
    }),
    Camera: refStub({
      setCamera: jest.fn(),
      flyTo: jest.fn(),
      moveTo: jest.fn(),
      zoomTo: jest.fn(),
      fitBounds: jest.fn(),
    }),
    ShapeSource: noop,
    LineLayer: noop,
    CircleLayer: noop,
    SymbolLayer: noop,
    PointAnnotation: noop,
    MarkerView: ({children}) => children ?? null,
    OfflineManager,
    OfflinePack,
    OfflinePackDownloadState,
    setAccessToken: jest.fn(),
  };
});

jest.mock('@react-native-community/blur', () => ({
  BlurView: () => null,
}));

jest.mock('react-native-udp', () => {
  const {EventEmitter} = require('events');
  class MockUdpSocket extends EventEmitter {
    bind() {
      queueMicrotask(() => this.emit('listening'));
    }
    close() {}
    send(_msg, _off, _len, _port, _addr, cb) {
      if (typeof cb === 'function') {
        cb();
      }
    }
  }
  return {
    __esModule: true,
    default: class UdpSockets {
      static createSocket() {
        return new MockUdpSocket();
      }
    },
  };
});
