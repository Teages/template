import type { Plugin } from 'vite'
import { nitro } from 'nitro/vite'
import { defineConfig } from 'vitest/config'

const rootDir = import.meta.dirname

export default defineConfig({
  plugins: [
    nitro({
      rootDir,
      serverDir: `${rootDir}/server`,
    }),
    nitroTestPlugin(),
  ],
  resolve: {
    alias: {
      '#server': `${rootDir}/server`,
    },
  },
  test: {
    name: 'server',
    include: ['test/server/**/*.{test,spec}.ts'],
    includeSource: ['server/**/*.ts'],
    environment: './test/server-env.ts',
    setupFiles: ['./test/server-setup.ts'],
  },
})

function nitroTestPlugin(): Plugin[] {
  const cleanups = new Set<() => Promise<void> | void>()

  return [{
    name: 'nitro:test',
    nitro: {
      setup(nitro) {
        cleanups.add(async () => nitro.close())
      },
    },
    async closeBundle() {
      await Promise.allSettled(Array.from(cleanups, async fn => fn()))
    },
  }]
}
