import type { TestProjectConfiguration } from 'vitest/config'
import { getVitestConfigFromNuxt } from '@nuxt/test-utils/config'
import { defineConfig, mergeConfig } from 'vitest/config'

export function api(rootDir: string): TestProjectConfiguration {
  return async () => mergeConfig(await getVitestConfigFromNuxt(undefined, {
    // @ts-expect-error internal flag
    nitroEnvironment: true,
    overrides: {
      rootDir,
      test: true,
    },
  }), defineConfig({
    test: {
      name: 'api',
      include: ['test/api/**/*.{test,spec}.ts'],
      environment: 'nitro',
      setupFiles: ['test/api/setup.ts'],
      isolate: false,
      maxWorkers: 1,
      sequence: { groupOrder: 1 },
    },
  }))
}
