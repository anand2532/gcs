import {type MapStyleVariant} from '../../../core/constants/map';
import {type OfflineBounds} from '../../offline/types';

export type {OfflineBounds};

export type OfflineRegionStatus =
  | 'pending'
  | 'downloading'
  | 'complete'
  | 'failed';

/** Persisted operator-facing offline region record (catalog metadata). */
export interface OfflineRegionRecord {
  readonly id: string;
  readonly label: string;
  readonly createdAt: number;
  readonly styleVariant: MapStyleVariant;
  readonly bounds: OfflineBounds;
  readonly minZoom: number;
  readonly maxZoom: number;
  /** Native offline pack name returned by MapLibre once scheduled. */
  readonly packName?: string;
  readonly status: OfflineRegionStatus;
  readonly lastError?: string;
  readonly estimatedBytes?: number;
}

export interface OfflineDownloadJob {
  readonly id: string;
  readonly regionId: string;
  readonly styleVariant: MapStyleVariant;
  readonly bounds: OfflineBounds;
  readonly minZoom: number;
  readonly maxZoom: number;
}
