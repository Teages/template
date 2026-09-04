import type { Plugin } from 'vite'
import type { TestProjectConfiguration } from 'vitest/config'
import { getVitestConfigFromNuxt } from '@nuxt/test-utils/config'
import { defineConfig, mergeConfig } from 'vitest/config'

const teardowns = new Set<() => Promise<unknown>>()

export function api(rootDir: string): TestProjectConfiguration {
  return async () => mergeConfig(await getVitestConfigFromNuxt(undefined, {
    // @ts-expect-error internal flag
    nitroEnvironment: true,
    overrides: {
      rootDir,
      test: true,
      hooks: {
        'nitro:init': (nitro) => {
          teardowns.add(() => nitro.close())
        },
      },
    },
  }), defineConfig({
    plugins: [nitroTeardownPlugin()],
    test: {
      name: 'api',
      include: ['test/api/**/*.{test,spec}.ts'],
      environment: 'test/api/env.ts',
      setupFiles: ['test/api/setup.ts'],
      isolate: false,
      maxWorkers: 1,
      sequence: { groupOrder: 1 },
    },
  }))
}

function nitroTeardownPlugin(): Plugin {
  let closed: Promise<unknown> | undefined

  return {
    name: 'nitro-teardown',
    async closeBundle() {
      closed ||= Promise.all(Array.from(teardowns, fn => fn()))
      await closed
    },
  }
}
