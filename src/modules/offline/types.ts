/**
 * Offline tile pack public types.
 *
 * These shapes are the *contract* exported to the rest of the app. They
 * intentionally avoid leaking MapLibre's internal `OfflinePack` /
 * `OfflinePackStatus` types so the rest of the codebase stays decoupled
 * from the map provider.
 */

/** Geographic bounding box used to bound an offline pack. */
export interface OfflineBounds {
  /** [longitude, latitude] of the north-east corner. */
  readonly ne: [number, number];
  /** [longitude, latitude] of the south-west corner. */
  readonly sw: [number, number];
}

export const OfflinePackState = {
  /** Pack is registered but no work has started. */
  Inactive: 'INACTIVE',
  /** Tiles are streaming in. */
  Active: 'ACTIVE',
  /** All required tiles have been written. */
  Complete: 'COMPLETE',
  /** Native side reported a failure. */
  Errored: 'ERRORED',
} as const;
export type OfflinePackState =
  (typeof OfflinePackState)[keyof typeof OfflinePackState];

/** Snapshot of an offline download as the native side streams progress. */
export interface OfflinePackProgress {
  readonly name: string;
  readonly state: OfflinePackState;
  /** 0..1 — fraction of required resources written. */
  readonly progress: number;
  readonly completedTileCount: number;
  readonly requiredTileCount: number;
  readonly completedBytes: number;
}

/** Lightweight description of a saved pack, returned by `list()`. */
export interface OfflinePackInfo {
  readonly name: string;
  readonly bounds?: OfflineBounds;
  readonly metadata?: Record<string, unknown>;
}

export interface OfflineDownloadOptions {
  readonly bounds: OfflineBounds;
  readonly minZoom: number;
  readonly maxZoom: number;
  readonly styleURL: string;
  readonly name: string;
  readonly metadata?: Record<string, unknown>;
}

export type OfflineProgressListener = (p: OfflinePackProgress) => void;
export type OfflineErrorListener = (err: {
  readonly name: string;
  readonly message: string;
}) => void;
