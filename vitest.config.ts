import { defineVitestProject } from '@nuxt/test-utils/config'
import { playwright } from '@vitest/browser-playwright'
import { defineConfig } from 'vitest/config'

const rootDir = import.meta.dirname

export default defineConfig({
  test: {
    projects: [
      {
        resolve: {
          alias: {
            '~': `${rootDir}/app`,
            '~~': rootDir,
            '#shared': `${rootDir}/shared`,
          },
        },
        test: {
          name: 'unit',
          include: ['test/unit/**/*.{test,spec}.ts'],
          environment: 'node',
        },
      },
      () =>
        defineVitestProject({
          test: {
            name: 'nuxt',
            include: ['test/nuxt/**/*.{test,spec}.ts'],
            environment: 'nuxt',
            environmentOptions: {
              nuxt: {
                rootDir,
                overrides: {
                  vue: {
                    runtimeCompiler: true,
                  },
                  experimental: {
                    viteEnvironmentApi: false,
                  },
                },
              },
            },
            browser: {
              enabled: true,
              provider: playwright(),
              instances: [{ browser: 'chromium', headless: true }],
            },
          },
        }),
    ],
    coverage: {
      provider: 'v8',
      exclude: ['**/node_modules/**', '**/.nuxt/**', 'test/**'],
    },
  },
})
