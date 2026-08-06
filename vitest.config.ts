import { defineConfig, mergeConfig } from 'vitest/config'
import { nitroTestPlugin } from './test/plugin.ts'
import viteConfig from './vite.config.ts'

const rootDir = import.meta.dirname

const authTestEnv = {
  BETTER_AUTH_SECRET: 'vitest-better-auth-secret-32chars',
  BETTER_AUTH_URL: 'http://localhost:20398',
} as const

export default defineConfig({
  test: {
    env: authTestEnv,
    globalSetup: ['./test/global-setup.ts'],
    projects: [
      // Pure Node — no Vite/Nitro plugins. Fastest feedback + in-source tests.
      defineConfig({
        plugins: [],
        resolve: {
          alias: {
            '~': rootDir,
          },
        },
        test: {
          name: 'unit',
          environment: 'node',
          include: ['test/unit/**/*.test.ts'],
          includeSource: ['server/**/*.ts', 'app/**/*.ts'],
        },
      }),
      // Full Nitro + Vue + Nuxt UI stack.
      mergeConfig(viteConfig, defineConfig({
        plugins: [nitroTestPlugin()],
        test: {
          name: 'e2e',
          include: ['test/e2e/**/*.test.ts'],
          setupFiles: './test/setup',
          environment: './test/env',
          isolate: false,
          maxWorkers: 1,
          sequence: { groupOrder: 1 },
          env: {
            ...authTestEnv,
            BETTER_AUTH_URL: 'http://localhost:20399',
          },
        },
        define: {
          'import.meta.MOCK_DATABASE': 'true',
        },
      })),
    ],
  },
})
