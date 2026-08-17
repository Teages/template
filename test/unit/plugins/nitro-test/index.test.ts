import { afterEach, describe, expect, it } from 'vitest'
import {
  ENV_RUNNER_ORIGIN_MODULE,
  nitroTestPlugin,
  teardownNitroInstances,
} from '~/plugins/nitro-test/index'

interface NitroTestGlobal {
  __envRunnerOrigin__?: string
}

const testGlobal = globalThis as unknown as NitroTestGlobal

const RESOLVED_ORIGIN_MODULE = `\0${ENV_RUNNER_ORIGIN_MODULE}`

interface OriginModuleHooks {
  resolveId: (id: string) => string | undefined
  load: (id: string) => string | undefined
}

afterEach(() => {
  delete testGlobal.__envRunnerOrigin__
})

describe('nitro test plugin wiring', () => {
  it('provides Nitro setup and Vite server lifecycle hooks', () => {
    const [plugin] = nitroTestPlugin()

    expect(plugin?.name).toBe('nitro:test')
    expect(typeof plugin?.nitro?.setup).toBe('function')
    expect(typeof plugin?.configureServer).toBe('function')
  })

  it('resolves and serves the env-runner origin virtual module', () => {
    const hooks = nitroTestPlugin()[0] as unknown as OriginModuleHooks
    testGlobal.__envRunnerOrigin__ = 'http://127.0.0.1:54321'

    expect(hooks.resolveId(ENV_RUNNER_ORIGIN_MODULE)).toBe(RESOLVED_ORIGIN_MODULE)
    expect(hooks.load(RESOLVED_ORIGIN_MODULE))
      .toBe('export const envRunnerOrigin = "http://127.0.0.1:54321"\n')
  })

  it('fails loudly when the origin module is loaded before configureServer ran', () => {
    const hooks = nitroTestPlugin()[0] as unknown as OriginModuleHooks

    expect(() => hooks.load(RESOLVED_ORIGIN_MODULE)).toThrow(/before configureServer/)
  })

  it('tears down idempotently when no test server is active', async () => {
    await expect(teardownNitroInstances()).resolves.toBeUndefined()
    await expect(teardownNitroInstances()).resolves.toBeUndefined()
  })
})
