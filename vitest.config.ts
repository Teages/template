import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

export default mergeConfig(viteConfig, defineConfig({
  test: {
    env: {
      BETTER_AUTH_SECRET: 'vitest-better-auth-secret-32chars',
      BETTER_AUTH_URL: 'http://localhost:20398',
      BETTER_AUTH_TRUSTED_ORIGINS: 'http://localhost:20398',
    },
    projects: [
      // Pure Node — fastest feedback + in-source tests.
      {
        test: {
          name: 'unit',
          environment: 'node',
          include: ['test/unit/**/*.test.ts'],
          includeSource: [
            'server/**/*.ts',
            'plugins/*/runtime/**/*.ts',
          ],
        },
      },
      // Bundled production output against Postgres, freshly built by
      // pretest:smoke (`pnpm build`). Excluded from `pnpm test`.
      {
        test: {
          name: 'smoke',
          environment: 'node',
          include: ['test/smoke/**/*.test.ts'],
          testTimeout: 120_000,
          hookTimeout: 120_000,
        },
      },
      // Full Nitro server in Vitest's native `nitro` environment (PGlite).
      {
        test: {
          name: 'e2e',
          environment: 'nitro',
          include: ['test/e2e/**/*.test.ts'],
        },
      },
    ],
  },
}))
