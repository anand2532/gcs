import {
  getPerfCountersSnapshot,
  recordCameraFollowCommand,
  recordOverlayRegistryFlush,
  recordTrailRedraw,
  resetPerfCounters,
} from '../src/app/runtime/perfCounters';

describe('perfCounters (__DEV__ gated)', () => {
  beforeEach(() => {
    resetPerfCounters();
  });

  it('tracks trail + camera increments when enabled', () => {
    recordTrailRedraw();
    recordCameraFollowCommand();
    recordOverlayRegistryFlush();
    const snap = getPerfCountersSnapshot();
    if (__DEV__) {
      expect(snap.trailRedraws).toBe(1);
      expect(snap.cameraFollowCommands).toBe(1);
      expect(snap.overlayRegistryFlushes).toBe(1);
    } else {
      expect(snap.trailRedraws).toBe(0);
      expect(snap.cameraFollowCommands).toBe(0);
      expect(snap.overlayRegistryFlushes).toBe(0);
    }
  });
});
