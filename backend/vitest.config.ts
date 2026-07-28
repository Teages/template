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
      // E2E / integration tests — boots an in-memory Nitro server.
      () => mergeConfig(viteConfig, defineConfig({
        plugins: [nitroTestPlugin()],
        test: {
          name: 'e2e',
          setupFiles: './test/setup.ts',
          include: ['test/e2e/**/*.test.ts'],
          environment: './test/env.ts',
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
