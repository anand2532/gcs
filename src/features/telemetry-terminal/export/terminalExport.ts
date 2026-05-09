import type {
  SessionExportMeta,
  TerminalPacketRecord,
} from '../state/terminalPacketTypes';

function csvEscape(s: string): string {
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function exportTerminalJsonLines(
  rows: TerminalPacketRecord[],
  meta: SessionExportMeta,
): string {
  const header = JSON.stringify({type: 'gcs.export.meta', ...meta});
  const lines = rows.map(r =>
    JSON.stringify({
      type: 'gcs.export.row',
      ...r,
    }),
  );
  return [header, ...lines].join('\n');
}

export function exportTerminalPlainText(
  rows: TerminalPacketRecord[],
  meta: SessionExportMeta,
): string {
  const metaBlock = [
    'GCS Telemetry Export',
    `exportedAt: ${new Date(meta.exportedAt).toISOString()}`,
    `appVersion: ${meta.appVersion}`,
    `transport: ${meta.transportLabel}`,
    `connection: ${meta.connectionLabel}`,
    `rows: ${meta.rowCount}`,
    meta.timeRange
      ? `range: ${new Date(meta.timeRange.from).toISOString()} → ${new Date(meta.timeRange.to).toISOString()}`
      : '',
    '---',
    '',
  ]
    .filter(Boolean)
    .join('\n');

  const body = rows
    .map(r => {
      const ts = new Date(r.t).toISOString();
      return `${ts}\t${r.direction}\t${r.category}\t${r.severity}\t${r.summary}`;
    })
    .join('\n');

  return `${metaBlock}${body}\n`;
}

export function exportTerminalCsv(
  rows: TerminalPacketRecord[],
  meta: SessionExportMeta,
): string {
  const metaLine = `# gcs-export v1 app=${csvEscape(meta.appVersion)} transport=${csvEscape(meta.transportLabel)} rows=${meta.rowCount}`;
  const header =
    'timestamp_iso,unix_ms,direction,category,severity,packet_type,source,target,summary';
  const data = rows.map(r => {
    const cols = [
      new Date(r.t).toISOString(),
      String(r.t),
      r.direction,
      r.category,
      r.severity,
      r.packetType ?? '',
      r.sourceSystem ?? '',
      r.targetSystem ?? '',
      r.summary,
    ].map(c => csvEscape(String(c)));
    return cols.join(',');
  });
  return [metaLine, header, ...data].join('\n');
}

export type ExportFormat = 'jsonl' | 'txt' | 'csv';

export function buildExportBody(
  format: ExportFormat,
  rows: TerminalPacketRecord[],
  meta: SessionExportMeta,
): string {
  switch (format) {
    case 'jsonl':
      return exportTerminalJsonLines(rows, meta);
    case 'txt':
      return exportTerminalPlainText(rows, meta);
    case 'csv':
      return exportTerminalCsv(rows, meta);
    default:
      return exportTerminalJsonLines(rows, meta);
  }
}
