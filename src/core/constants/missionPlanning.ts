/**
 * Mission planning / survey generation guardrails. Keeps path generation on the
 * JS thread bounded so rapid edits and large areas cannot freeze the UI.
 */

/** Delay before recomputing survey path after polygon or survey input changes. */
export const SURVEY_PATH_DEBOUNCE_MS = 120;

/** Max grid cells evaluated in survey-engine (lat × lon nested loops). */
export const SURVEY_MAX_GRID_CELLS = 25_000;

/** Hard cap on waypoints emitted for map overlay + simulation. */
export const SURVEY_MAX_PATH_POINTS = 15_000;
