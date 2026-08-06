import type { Environment } from 'vitest/runtime'

export default <Environment>{
  name: 'nitro',
  viteEnvironment: 'nitro',
  async setup() {
    return {
      teardown() {
      },
    }
  },
}
