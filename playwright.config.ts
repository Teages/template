import type { ConfigOptions } from '@nuxt/test-utils/playwright'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { defineConfig, devices } from '@playwright/test'

const frontendDir = dirname(fileURLToPath(import.meta.url))
const backendDir = join(frontendDir, '../backend')
const baseURL = 'http://localhost:5678'
const backendURL = 'http://localhost:20398'

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
  webServer: [
    {
      command: 'pnpm dev:mock',
      cwd: backendDir,
      url: `${backendURL}/graphql`,
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: 'pnpm exec nuxt preview --port 5678',
      url: baseURL,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
  use: {
    baseURL,
    trace: 'on-first-retry',
    nuxt: {
      rootDir: frontendDir,
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
