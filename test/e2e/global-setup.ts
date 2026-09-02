import { fileURLToPath } from 'node:url'
import { createTest, exposeContextToEnv } from '@nuxt/test-utils/e2e'

const rootDir = fileURLToPath(new URL('../..', import.meta.url))

/**
 * Boot the app once per run and share the context with every test file via
 * `NUXT_TEST_CONTEXT` (workers recover it in `useTestContext`), so `$fetch`
 * works in specs without per-file `setup()`.
 *
 * `dev: true` because the PGlite dev database and dev-only tasks only exist
 * in the dev pipeline; flip to a production build once the suite has
 * `POSTGRES_*` available (see `createTestContext` defaults).
 */
export default async function () {
  const hooks = createTest({ rootDir, dev: true })
  await hooks.beforeAll()
  exposeContextToEnv()
  return async () => {
    await hooks.afterAll()
  }
}
