import {APP_VERSION} from '../src/core/constants/appVersion';
import {LogLevel} from '../src/core/logger/Logger';
import {
  buildExportBody,
  exportTerminalCsv,
} from '../src/features/telemetry-terminal/export/terminalExport';

import type {TerminalPacketRecord} from '../src/features/telemetry-terminal/state/terminalPacketTypes';

const meta = {
  exportedAt: 1_700_000_000_000,
  appVersion: APP_VERSION,
  transportLabel: 'SIMULATION',
  connectionLabel: 'SIM',
  rowCount: 1,
} as const;

const sample: TerminalPacketRecord[] = [
  {
    id: 'a',
    t: 100,
    direction: 'INTERNAL',
    category: 'APP',
    severity: LogLevel.Info,
    summary: 'boot',
  },
];

describe('terminalExport', () => {
  it('buildExportBody jsonl contains meta and rows', () => {
    const body = buildExportBody('jsonl', sample, {...meta, rowCount: 1});
    expect(body).toContain('gcs.export.meta');
    expect(body).toContain('gcs.export.row');
    expect(body).toContain('boot');
  });

  it('csv includes header row', () => {
    const csv = exportTerminalCsv(sample, {...meta, rowCount: 1});
    expect(csv).toContain('timestamp_iso');
    expect(csv).toContain('boot');
  });
});
