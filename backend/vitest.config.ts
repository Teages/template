import { defineConfig, mergeConfig } from 'vitest/config'
import { nitroTestPlugin } from './test/plugin'
import viteConfig from './vite.config'

export default mergeConfig(viteConfig, defineConfig({
  plugins: [
    nitroTestPlugin(),
  ],
  test: {
    name: 'server',
    setupFiles: './test/setup.ts',
    include: [
      'test/e2e/**/*.test.ts',
    ],
    includeSource: [
      'server/**/*.ts',
    ],
    environment: './test/env.ts',
    coverage: {
      include: ['server/**/*.ts'],
      exclude: ['server/**/*.d.ts'],
    },
  },
  define: {
    'import.meta.MOCK_DATABASE': 'true',
  },
}))
