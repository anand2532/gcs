import {log} from '../../core/logger/Logger';

export type MissionTransferPhase =
  | 'idle'
  | 'uploading'
  | 'downloading'
  | 'error';

export interface MissionWaypointLite {
  readonly latDeg: number;
  readonly lonDeg: number;
  readonly altM: number;
  readonly seq: number;
}

/**
 * MAVLink mission upload/download coordinator (MISSION_* micro-protocol).
 * Full sequencing against a live FC is environment-dependent — this class
 * owns phase tracking and retry policy hooks for integration tests / future wiring.
 */
export class MissionTransferCoordinator {
  private phase: MissionTransferPhase = 'idle';
  private targetCount = 0;
  private received: MissionWaypointLite[] = [];

  getPhase(): MissionTransferPhase {
    return this.phase;
  }

  reset(): void {
    this.phase = 'idle';
    this.targetCount = 0;
    this.received = [];
  }

  /** Begin logical upload — caller must issue MAVLink MISSION_* exchange on the wire. */
  beginUpload(expectedCount: number): void {
    this.targetCount = expectedCount;
    this.phase = 'uploading';
    log.communication.event('mission.upload.begin', {count: expectedCount});
  }

  /** Begin logical download from FC. */
  beginDownload(): void {
    this.phase = 'downloading';
    this.received = [];
    log.communication.event('mission.download.begin', {});
  }

  recordWaypoint(w: MissionWaypointLite): void {
    this.received.push(w);
  }

  /** Mark upload finished (MISSION_ACK success path). */
  completeUploadOk(): void {
    this.phase = 'idle';
    log.communication.event('mission.upload.complete', {});
  }

  /** Mark download finished after MISSION_COUNT items pulled. */
  completeDownloadOk(): MissionWaypointLite[] {
    this.phase = 'idle';
    log.communication.event('mission.download.complete', {
      count: this.received.length,
    });
    return this.received;
  }

  fail(reason: string): void {
    this.phase = 'error';
    log.communication.error('mission.transfer.error', {reason});
  }

  progress(): {readonly current: number; readonly total: number} {
    return {
      current: this.received.length,
      total: this.targetCount,
    };
  }
}
