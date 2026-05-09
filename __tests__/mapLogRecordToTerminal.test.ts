import {LogLevel, type LogRecord} from '../src/core/logger/Logger';
import {mapLogRecordToTerminal} from '../src/features/telemetry-terminal/ingestion/mapLogRecordToTerminal';

describe('mapLogRecordToTerminal', () => {
  it('maps error logs to ERROR category', () => {
    const r: LogRecord = {
      t: 1,
      level: LogLevel.Error,
      category: 'app',
      message: 'boom',
    };
    const row = mapLogRecordToTerminal(r, 'id-1');
    expect(row.category).toBe('ERROR');
    expect(row.direction).toBe('ERROR');
  });

  it('maps watchdog category to CONNECTION', () => {
    const r: LogRecord = {
      t: 1,
      level: LogLevel.Info,
      category: 'watchdog',
      message: 'tick',
    };
    const row = mapLogRecordToTerminal(r, 'id-2');
    expect(row.category).toBe('CONNECTION');
  });
});
