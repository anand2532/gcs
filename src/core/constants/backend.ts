/**
 * Backend integration knobs.
 *
 * Set `API_BASE_URL` to your REST gateway base URL (no trailing slash) when
 * wiring the HTTP client. CI and offline-first demos leave this empty.
 *
 * Inject per-environment values via your release pipeline or a dedicated
 * native config module — do not commit secrets.
 */
export const API_BASE_URL = '';

/** When true, map access requires authenticated session (see session module). */
export const REQUIRE_AUTH_GATE = false;
