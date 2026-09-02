import type { TestProjectConfiguration } from 'vitest/config'
import { defineConfig } from 'vitest/config'

/**
 * Standard `@nuxt/test-utils/e2e` tests against a real dev server (see
 * test/e2e/global-setup.ts). This must stay a plain project — deriving it
 * from `getVitestConfigFromNuxt`/`defineVitestProject` inlines the e2e
 * module, which tries to bundle `bun:test` and other runner shims.
 *
 * `*.e2e.spec.ts` keeps Playwright's default `testMatch` from picking these
 * files up (playwright.config.ts ignores them explicitly).
 */
export function e2e(): TestProjectConfiguration {
  return defineConfig({
    test: {
      name: 'e2e',
      include: ['test/e2e/**/*.e2e.spec.ts'],
      environment: 'node',
      globalSetup: ['./test/e2e/global-setup.ts'],
      isolate: false,
      maxWorkers: 1,
      // unique group so single-worker projects can run alongside the
      // parallel nuxt/unit projects in a full run
      sequence: { groupOrder: 2 },
    },
  })
}
