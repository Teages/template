import { defineConfig, mergeConfig } from 'vitest/config'
import { nitroTestPlugin } from './test/plugin'
import viteConfig from './vite.config'

const rootDir = import.meta.dirname

export default defineConfig({
  test: {
    projects: [
      // Pure unit tests (in-source) — no Nitro runtime, fast feedback.
      defineConfig({
        resolve: {
          alias: {
            '~': rootDir,
          },
        },
        test: {
          name: 'unit',
          environment: 'node',
          include: ['test/unit/**/*.test.ts'],
          includeSource: ['server/**/*.ts'],
        },
        define: {
          'import.meta.vitest': 'undefined',
          'import.meta.MOCK_DATABASE': 'true',
        },
      }),
      // E2E / integration tests — share ONE in-memory Nitro instance across all
      // files (isolate:false + maxWorkers:1 → Vitest reuses a single worker).
      // This avoids re-booting Nitro/PGlite per file, drastically cutting memory
      // and startup time when the test suite grows. Tests must isolate data via
      // unique prefixes (see `uniqueTodoTitle` / `uniqueAuthEmail` in test/utils)
      // or call `resetTestDatabase()` between tests.
      () => mergeConfig(viteConfig, defineConfig({
        plugins: [nitroTestPlugin()],
        test: {
          name: 'e2e',
          setupFiles: './test/setup.ts',
          include: ['test/e2e/**/*.test.ts'],
          environment: './test/env.ts',
          isolate: false,
          maxWorkers: 1,
          // Distinct groupOrder so Vitest can schedule this single-worker
          // project alongside the (parallel) unit project without conflict.
          sequence: { groupOrder: 1 },
        },
        define: {
          'import.meta.MOCK_DATABASE': 'true',
        },
      })),
    ],
    coverage: {
      include: ['server/**/*.ts'],
      exclude: ['server/**/*.d.ts'],
    },
  },
})
