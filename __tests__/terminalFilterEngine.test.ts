import {LogLevel} from '../src/core/logger/Logger';
import {
  passesTerminalFilters,
  type TerminalFilterState,
} from '../src/features/telemetry-terminal/filters/terminalFilterEngine';

import type {TerminalPacketRecord} from '../src/features/telemetry-terminal/state/terminalPacketTypes';

function row(
  over: Partial<TerminalPacketRecord>,
): TerminalPacketRecord {
  return {
    id: 'r1',
    t: 1,
    direction: 'INTERNAL',
    category: 'APP',
    severity: LogLevel.Info,
    summary: 'hello world',
    ...over,
  };
}

describe('terminalFilterEngine', () => {
  const baseFilter: TerminalFilterState = {
    query: '',
    minLevel: 'all',
    disabledCategories: new Set(),
  };

  it('filters by query substring', () => {
    const f: TerminalFilterState = {...baseFilter, query: 'alp'};
    expect(passesTerminalFilters(row({summary: 'alpha'}), f)).toBe(true);
    expect(passesTerminalFilters(row({summary: 'beta'}), f)).toBe(false);
  });

  it('respects min level', () => {
    const f: TerminalFilterState = {...baseFilter, minLevel: LogLevel.Warn};
    expect(
      passesTerminalFilters(row({severity: LogLevel.Info}), f),
    ).toBe(false);
    expect(
      passesTerminalFilters(row({severity: LogLevel.Warn}), f),
    ).toBe(true);
  });

  it('hides disabled categories', () => {
    const f: TerminalFilterState = {
      ...baseFilter,
      disabledCategories: new Set(['APP']),
    };
    expect(passesTerminalFilters(row({category: 'APP'}), f)).toBe(false);
    expect(passesTerminalFilters(row({category: 'SIM'}), f)).toBe(true);
  });
});
