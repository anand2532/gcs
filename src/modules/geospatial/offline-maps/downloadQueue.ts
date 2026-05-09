/**
 * Serial download queue for offline packs — one native pack at a time to
 * avoid SQLite contention and predictable UX on low-bandwidth links.
 */

import {RegionCatalog} from './regionCatalog';
import {type OfflineDownloadJob} from './types';
import {MAP_STYLE_URL_VARIANTS} from '../../../core/constants/map';
import {log} from '../../../core/logger/Logger';
import {OfflineMapManager, buildPackName} from '../../offline';
import {OfflinePackState} from '../../offline/types';

export type QueueProgressHandler = (job: OfflineDownloadJob, progress: number) => void;

export class OfflineDownloadQueue {
  private queue: OfflineDownloadJob[] = [];
  private running = false;

  enqueue(job: OfflineDownloadJob): void {
    this.queue.push(job);
    this.pump().catch(() => {});
  }

  async pump(onProgress?: QueueProgressHandler): Promise<void> {
    if (this.running) {
      return;
    }
    this.running = true;
    try {
      while (this.queue.length > 0) {
        const job = this.queue.shift()!;
        RegionCatalog.upsert({
          id: job.regionId,
          label: job.regionId,
          createdAt: Date.now(),
          styleVariant: job.styleVariant,
          bounds: job.bounds,
          minZoom: job.minZoom,
          maxZoom: job.maxZoom,
          status: 'downloading',
          packName: undefined,
        });
        const styleURL = MAP_STYLE_URL_VARIANTS[job.styleVariant];
        const packName = buildPackName(`q_${job.styleVariant}`);
        try {
          await OfflineMapManager.downloadVisibleArea(
            {
              name: packName,
              styleURL,
              bounds: job.bounds,
              minZoom: job.minZoom,
              maxZoom: job.maxZoom,
              metadata: {
                regionId: job.regionId,
                styleVariant: job.styleVariant,
                ne: job.bounds.ne,
                sw: job.bounds.sw,
                createdAt: Date.now(),
                minZoom: job.minZoom,
                maxZoom: job.maxZoom,
              },
            },
            p => {
              onProgress?.(job, p.progress);
              if (p.state === OfflinePackState.Complete) {
                RegionCatalog.upsert({
                  id: job.regionId,
                  label: job.regionId,
                  createdAt: Date.now(),
                  styleVariant: job.styleVariant,
                  bounds: job.bounds,
                  minZoom: job.minZoom,
                  maxZoom: job.maxZoom,
                  status: 'complete',
                  packName,
                  estimatedBytes: p.completedBytes,
                });
              }
            },
            err => {
              log.map.error('offline.queue.error', {message: err.message});
              RegionCatalog.upsert({
                id: job.regionId,
                label: job.regionId,
                createdAt: Date.now(),
                styleVariant: job.styleVariant,
                bounds: job.bounds,
                minZoom: job.minZoom,
                maxZoom: job.maxZoom,
                status: 'failed',
                lastError: err.message,
              });
            },
          );
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          RegionCatalog.upsert({
            id: job.regionId,
            label: job.regionId,
            createdAt: Date.now(),
            styleVariant: job.styleVariant,
            bounds: job.bounds,
            minZoom: job.minZoom,
            maxZoom: job.maxZoom,
            status: 'failed',
            lastError: message,
          });
        }
      }
    } finally {
      this.running = false;
    }
  }

  pendingCount(): number {
    return this.queue.length + (this.running ? 1 : 0);
  }
}

export const offlineDownloadQueue = new OfflineDownloadQueue();
