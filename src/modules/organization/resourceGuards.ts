/**
 * Operational resource policy for tactical surfaces vs organization workspace.
 *
 * - **Simulation**: Safe to `pause()` / `resume()` when navigating away from the
 *   main map — avoids idle ticking while keeping mission state intact.
 * - **MAVLink / live links**: Do **not** call `telemetrySourceRegistry.stopActive()` on
 *   navigation alone — that tears down sockets and drops the link. Prefer UI-side
 *   throttling and selective subscriptions for fleet dashboards instead.
 */
