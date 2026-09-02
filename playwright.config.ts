import type { ConfigOptions } from '@nuxt/test-utils/playwright'
import { dirname } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { defineConfig, devices } from '@playwright/test'

const rootDir = dirname(fileURLToPath(import.meta.url))
const baseURL = 'http://localhost:5678'

export default defineConfig<ConfigOptions>({
  testDir: './test/e2e',
  fullyParallel: true,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI
    ? [['html'], ['junit', { outputFile: 'test-report.junit.xml' }]]
    : 'html',
  timeout: 120_000,
  webServer: {
    // Dev server on the in-memory PGlite dev database (@teages/nitro-drizzle
    // devMock): tests provision their own users through the real Better Auth
    // API (see test/e2e/utils/auth.ts), so no test-only server tasks are
    // needed.
    command: 'pnpm dev --port 5678',
    cwd: rootDir,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  use: {
    baseURL,
    trace: 'on-first-retry',
    nuxt: {
      rootDir,
      host: baseURL,
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
