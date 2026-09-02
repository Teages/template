import type { TestProjectConfiguration } from 'vitest/config'
import { defineVitestProject } from '@nuxt/test-utils/config'
import { playwright } from '@vitest/browser-playwright'

export function nuxt(rootDir: string): TestProjectConfiguration {
  return defineVitestProject({
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
          },
        },
      },
      browser: {
        enabled: true,
        provider: playwright(),
        instances: [{ browser: 'chromium', headless: true }],
      },
    },
  })
}
