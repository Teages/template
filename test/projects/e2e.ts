import type { TestProjectConfiguration } from 'vitest/config'
import { defineConfig } from 'vitest/config'

/**
 * Playwright-driven browser e2e running inside vitest: the project
 * global-setup boots the dev server and a shared chromium `launchServer`,
 * and specs use `@playwright/test` as a library (real Page/expect with
 * auto-waiting) via test/e2e/test-utils.ts. Vitest browser mode
 * (`browser.provider`) stays reserved for the in-browser component tests
 * in the nuxt project — its `page` is not a Playwright Page and cannot
 * navigate an external app.
 */
export function e2e(): TestProjectConfiguration {
  return defineConfig({
    test: {
      name: 'e2e',
      include: ['test/e2e/**/*.spec.ts'],
      environment: 'node',
      globalSetup: ['./test/e2e/global-setup.ts'],
      isolate: false,
      maxWorkers: 1,
      testTimeout: 120_000,
      // unique group so single-worker projects (api, e2e) can run alongside
      // the parallel nuxt/unit projects in a full run
      sequence: { groupOrder: 2 },
    },
  })
}
