import { describe, expect, it } from 'vitest'
import {
  nitroTestPlugin,
  teardownNitroInstances,
} from '~/plugins/nitro-test/index'

describe('nitro test plugin wiring', () => {
  it('provides Nitro setup and Vite server lifecycle hooks', () => {
    const [plugin] = nitroTestPlugin()

    expect(plugin?.name).toBe('nitro:test')
    expect(typeof plugin?.nitro?.setup).toBe('function')
    expect(typeof plugin?.configureServer).toBe('function')
  })

  it('tears down idempotently when no test server is active', async () => {
    await expect(teardownNitroInstances()).resolves.toBeUndefined()
    await expect(teardownNitroInstances()).resolves.toBeUndefined()
  })
})
