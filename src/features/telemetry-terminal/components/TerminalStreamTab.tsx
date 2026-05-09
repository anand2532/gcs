import React, {memo, useCallback, useDeferredValue, useMemo, useState} from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {CATEGORY_CHIP_LABEL} from './terminalCategoryLabels';
import {LogLevel} from '../../../core/logger/Logger';
import {GlassPanel} from '../../../ui/components/GlassPanel';
import {useTheme} from '../../../ui/theme/ThemeProvider';
import {
  ALL_TERMINAL_CATEGORIES,
  passesTerminalFilters,
  type TerminalFilterState,
} from '../filters/terminalFilterEngine';
import {
  TERMINAL_LIST_INITIAL_RENDER,
  TERMINAL_LIST_MAX_BATCH,
  TERMINAL_LIST_UPDATE_BATCHING_MS,
  TERMINAL_LIST_WINDOW,
} from '../performance/terminalListConfig';
import {TERMINAL_PACKET_CAP} from '../state/terminalPacketStore';

import type {
  TerminalCategory,
  TerminalPacketRecord,
} from '../state/terminalPacketTypes';

const LEVEL_CHIPS: Array<{key: LogLevel | 'all'; label: string}> = [
  {key: 'all', label: 'All levels'},
  {key: LogLevel.Info, label: 'Info+'},
  {key: LogLevel.Warn, label: 'Warn+'},
  {key: LogLevel.Error, label: 'Errors only'},
];

interface TerminalStreamTabProps {
  readonly lines: TerminalPacketRecord[];
  readonly pauseScroll: boolean;
  readonly query: string;
  readonly onQueryChange: (q: string) => void;
  readonly minLevel: LogLevel | 'all';
  readonly onMinLevel: (l: LogLevel | 'all') => void;
  readonly disabledCategories: ReadonlySet<TerminalCategory>;
  readonly onToggleCategory: (c: TerminalCategory) => void;
}

export function TerminalStreamTab({
  lines,
  pauseScroll,
  query,
  onQueryChange,
  minLevel,
  onMinLevel,
  disabledCategories,
  onToggleCategory,
}: TerminalStreamTabProps): React.JSX.Element {
  const theme = useTheme();
  const [ttyCompact, setTtyCompact] = useState(false);
  /** Defer heavy filtering while typing so the input stays instant */
  const deferredQuery = useDeferredValue(query);

  const filterState: TerminalFilterState = useMemo(
    () => ({query: deferredQuery, minLevel, disabledCategories}),
    [deferredQuery, minLevel, disabledCategories],
  );

  const filtered = useMemo(
    () => lines.filter(r => passesTerminalFilters(r, filterState)),
    [lines, filterState],
  );

  const streamSummary = useMemo(() => {
    const total = lines.length;
    const shown = filtered.length;
    if (total === 0) {
      return 'No events yet — connect or run sim to see telemetry.';
    }
    if (shown === total) {
      return `Showing all ${total.toLocaleString()} events`;
    }
    return `Showing ${shown.toLocaleString()} of ${total.toLocaleString()} events`;
  }, [lines.length, filtered.length]);

  const renderItem = useCallback(
    ({item}: {item: TerminalPacketRecord}) => (
      <TerminalPacketRow
        compact={ttyCompact}
        item={item}
        mono={theme.typography.fontFamily.mono}
      />
    ),
    [theme.typography.fontFamily.mono, ttyCompact],
  );

  const statusFooter = useMemo(() => {
    const hiddenCats = disabledCategories.size;
    const q = query.trim();
    const qShort = q.length > 28 ? `${q.slice(0, 26)}…` : q;
    const parts = [
      `buffer ${Math.min(lines.length, TERMINAL_PACKET_CAP).toLocaleString()}/${TERMINAL_PACKET_CAP.toLocaleString()}`,
      `${hiddenCats} cat filter${hiddenCats === 1 ? '' : 's'}`,
      `lvl ${minLevel === 'all' ? 'all' : String(minLevel)}`,
      pauseScroll ? 'scroll paused' : 'scroll live',
    ];
    if (qShort) {
      parts.push(`grep "${qShort}"`);
    }
    return parts.join(' · ');
  }, [
    disabledCategories.size,
    lines.length,
    minLevel,
    pauseScroll,
    query,
  ]);

  const listEmpty = useMemo(
    () => (
      <View style={styles.emptyWrap} accessibilityRole="text">
        <Text style={[styles.emptyTitle, {color: theme.palette.fg200}]}>
          No matching events
        </Text>
        <Text style={[styles.emptyHint, {color: theme.palette.fg400}]}>
          Clear search, widen level filter, or re-enable categories above.
        </Text>
      </View>
    ),
    [theme.palette.fg200, theme.palette.fg400],
  );

  const keyExtractor = useCallback((item: TerminalPacketRecord) => item.id, []);

  const listProps = useMemo(
    () =>
      Platform.OS === 'ios'
        ? {maintainVisibleContentPosition: {minIndexForVisible: 0} as const}
        : {},
    [],
  );

  return (
    <View style={[styles.flex, {backgroundColor: theme.palette.bg900}]}>
      <View style={styles.promptRow}>
        <Text
          accessibilityElementsHidden
          importantForAccessibility="no"
          style={[styles.promptGlyph, {color: theme.palette.accentGreen}]}>
          ›
        </Text>
        <TextInput
          accessibilityLabel="Search telemetry stream"
          placeholder="filter…"
          placeholderTextColor={theme.palette.fg400}
          value={query}
          onChangeText={onQueryChange}
          style={[
            styles.search,
            styles.searchInput,
            {
              color: theme.palette.fg100,
              borderColor: theme.palette.surfaceLine,
              fontFamily: theme.typography.fontFamily.mono,
              backgroundColor: theme.palette.bg800,
            },
          ]}
        />
      </View>

      <View style={styles.ttyToggleRow}>
        <Pressable
          accessibilityRole="switch"
          accessibilityState={{checked: ttyCompact}}
          onPress={() => setTtyCompact(c => !c)}
          style={[
            styles.ttyToggle,
            {
              borderColor: ttyCompact
                ? theme.palette.accentCyan
                : theme.palette.surfaceLine,
              backgroundColor: ttyCompact
                ? theme.palette.accentCyanDim
                : 'transparent',
            },
          ]}>
          <Text
            style={{
              color: ttyCompact ? theme.palette.fg100 : theme.palette.fg400,
              fontSize: 10,
              fontWeight: '700',
            }}>
            TTY dense
          </Text>
        </Pressable>
      </View>

      <Text style={[styles.sectionLabel, {color: theme.palette.fg400}]}>
        Categories — tap to show or hide
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.catRow}
        style={styles.catScroll}>
        {ALL_TERMINAL_CATEGORIES.map(c => {
          const active = !disabledCategories.has(c);
          return (
            <Pressable
              key={c}
              accessibilityLabel={`Category ${CATEGORY_CHIP_LABEL[c]}, ${active ? 'visible' : 'hidden'}`}
              onPress={() => onToggleCategory(c)}
              style={[
                styles.catChip,
                {
                  borderColor: active
                    ? theme.palette.accentCyan
                    : theme.palette.surfaceLine,
                  backgroundColor: active
                    ? theme.palette.accentCyanDim
                    : 'transparent',
                },
              ]}>
              <Text
                style={{
                  color: active ? theme.palette.fg100 : theme.palette.fg400,
                  fontSize: 10,
                  fontWeight: '700',
                }}>
                {CATEGORY_CHIP_LABEL[c]}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Text style={[styles.sectionLabel, {color: theme.palette.fg400}]}>
        Minimum severity
      </Text>
      <View style={styles.chips}>
        {LEVEL_CHIPS.map(c => (
          <Pressable
            key={c.key}
            accessibilityRole="button"
            accessibilityState={{selected: minLevel === c.key}}
            onPress={() => onMinLevel(c.key)}
            style={[
              styles.chip,
              {
                borderColor:
                  minLevel === c.key
                    ? theme.palette.accentAmber
                    : theme.palette.surfaceLine,
              },
            ]}>
            <Text style={{color: theme.palette.fg200, fontSize: 10}}>
              {c.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <GlassPanel
        intensity="strong"
        style={[
          styles.listWrap,
          {backgroundColor: theme.palette.bg800, borderColor: theme.palette.surfaceLine},
        ]}>
        <Text
          style={[
            styles.streamSummary,
            {color: theme.palette.fg400, borderBottomColor: theme.palette.surfaceLine},
          ]}>
          {streamSummary}
        </Text>
        <FlatList
          style={styles.listFlex}
          data={filtered}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          inverted
          removeClippedSubviews
          initialNumToRender={TERMINAL_LIST_INITIAL_RENDER}
          maxToRenderPerBatch={TERMINAL_LIST_MAX_BATCH}
          windowSize={TERMINAL_LIST_WINDOW}
          updateCellsBatchingPeriod={TERMINAL_LIST_UPDATE_BATCHING_MS}
          ListEmptyComponent={listEmpty}
          {...listProps}
          scrollEnabled={!pauseScroll}
        />
        <Text
          style={[
            styles.statusFooter,
            {
              color: theme.palette.fg400,
              borderTopColor: theme.palette.surfaceLine,
              fontFamily: theme.typography.fontFamily.mono,
            },
          ]}
          numberOfLines={2}
          ellipsizeMode="tail">
          {statusFooter}
        </Text>
      </GlassPanel>
    </View>
  );
}

const TerminalPacketRow = memo(function TerminalPacketRow({
  compact,
  item,
  mono,
}: {
  compact: boolean;
  item: TerminalPacketRecord;
  mono: string | undefined;
}): React.JSX.Element {
  const theme = useTheme();
  const [open, setOpen] = useState(false);

  const color =
    item.severity === LogLevel.Error
      ? theme.palette.danger
      : item.severity === LogLevel.Warn
        ? theme.palette.warn
        : theme.palette.fg300;

  const time =
    new Date(item.t).toISOString().split('T')[1]?.slice(0, 12) ?? '';

  const dirColors: Record<string, string> = {
    INCOMING: theme.palette.accentCyan,
    OUTGOING: theme.palette.accentAmber,
    INTERNAL: theme.palette.fg400,
    ERROR: theme.palette.danger,
    WARNING: theme.palette.warn,
  };

  const collapsedLines = open ? undefined : compact ? 1 : 3;
  const fontSize = compact ? 10 : 11;
  const lineHeight = compact ? 14 : 15;
  const rowPadV = compact ? 3 : 6;

  return (
    <Pressable
      onPress={() => setOpen(o => !o)}
      style={({pressed}) => [
        styles.row,
        {opacity: pressed ? 0.92 : 1, paddingVertical: rowPadV},
      ]}>
      <View style={[styles.sev, {backgroundColor: color}]} />
      <View style={styles.rowBody}>
        <Text
          style={[
            styles.rowText,
            {
              color: theme.palette.fg100,
              fontFamily: mono,
              fontSize,
              lineHeight,
            },
          ]}
          numberOfLines={collapsedLines}>
          <Text style={{color}}>{time}</Text>
          {'  '}
          <Text style={{color: dirColors[item.direction] ?? theme.palette.fg300}}>
            {item.direction}
          </Text>
          {'  '}
          <Text style={{color: theme.palette.accentCyan}}>
            [{CATEGORY_CHIP_LABEL[item.category]}]
          </Text>
          {' '}
          {item.packetType ? (
            <Text style={{color: theme.palette.fg200}}>{item.packetType} · </Text>
          ) : null}
          {item.summary}
        </Text>
        {open ? (
          <Text
            style={[
              styles.detail,
              {
                color: theme.palette.fg300,
                fontFamily: mono,
                fontSize: compact ? 9 : 10,
                lineHeight: compact ? 13 : 14,
              },
            ]}>
            {item.sourceSystem || item.targetSystem
              ? `SRC ${item.sourceSystem ?? '—'} → TGT ${item.targetSystem ?? '—'}\n`
              : ''}
            {item.payload ? JSON.stringify(item.payload, null, 2) : ''}
            {item.rawHex ? `\nRAW ${item.rawHex}` : ''}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}, areTerminalRowsEqual);

function areTerminalRowsEqual(
  prev: {
    compact: boolean;
    item: TerminalPacketRecord;
    mono: string | undefined;
  },
  next: {
    compact: boolean;
    item: TerminalPacketRecord;
    mono: string | undefined;
  },
): boolean {
  return (
    prev.compact === next.compact &&
    prev.mono === next.mono &&
    prev.item === next.item
  );
}

const styles = StyleSheet.create({
  flex: {flex: 1, minHeight: 120},
  promptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  promptGlyph: {
    fontSize: 16,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  search: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
  },
  searchInput: {flex: 1, marginBottom: 0},
  ttyToggleRow: {marginBottom: 8},
  ttyToggle: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
  },
  sectionLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 6,
  },
  catScroll: {marginBottom: 8, maxHeight: 40},
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: 8,
  },
  catChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chips: {flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10},
  streamSummary: {
    fontSize: 10,
    fontWeight: '600',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  emptyWrap: {
    paddingVertical: 28,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  emptyTitle: {fontSize: 13, fontWeight: '700', marginBottom: 6},
  emptyHint: {fontSize: 11, lineHeight: 16, textAlign: 'center'},
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
  },
  listWrap: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
    padding: 0,
    minHeight: 0,
    borderWidth: StyleSheet.hairlineWidth,
  },
  listFlex: {flex: 1},
  statusFooter: {
    fontSize: 9,
    lineHeight: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(120,200,255,0.06)',
  },
  sev: {width: 3, borderRadius: 2, marginRight: 8, minHeight: 18},
  rowBody: {flex: 1},
  rowText: {fontSize: 11, lineHeight: 15},
  detail: {marginTop: 6, fontSize: 10, lineHeight: 14},
});
