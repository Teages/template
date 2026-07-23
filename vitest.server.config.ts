import { nitro } from 'nitro/vite'
import { defineConfig } from 'vitest/config'

const rootDir = import.meta.dirname

export default defineConfig({
  plugins: [
    nitro({
      rootDir,
      serverDir: `${rootDir}/server`,
    }),
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
