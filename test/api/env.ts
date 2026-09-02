import type { Environment } from 'vitest/runtime'

export default {
  name: 'nitro',
  viteEnvironment: 'nitro',
  async setup() {
    return {
      teardown() {
      },
    }
  },
} satisfies Environment
