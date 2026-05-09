/** FlatList tuning for high-rate telemetry streams — adjust after profiling. */
export const TERMINAL_LIST_INITIAL_RENDER = 24;
export const TERMINAL_LIST_MAX_BATCH = 40;
/** Larger window = smoother fast scroll; trades memory for fewer blank frames */
export const TERMINAL_LIST_WINDOW = 12;
export const TERMINAL_LIST_UPDATE_BATCHING_MS = 50;
