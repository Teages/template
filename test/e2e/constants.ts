/** Shared addresses between the e2e global setup (main process) and the specs (worker). */
export const E2E_BASE_URL = 'http://localhost:20398'

/** Fixed `wsPath` so specs can connect without state handoff (localhost-only, tests). */
export const E2E_BROWSER_WS = 'ws://localhost:20399/vitest-e2e-browser'
