/** Fixed credentials for Playwright E2E; keep in sync with `backend/server/utils/e2e-user.ts`. */
export const E2E_TEST_USER = {
  name: 'E2E User',
  email: 'e2e@test.local',
  password: 'password-8-chars',
} as const
