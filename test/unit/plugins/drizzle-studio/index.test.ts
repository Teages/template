import { describe, expect, it } from 'vitest'
import {
  configureDrizzleStudioNitro,
  drizzleStudioUrl,
  isDrizzleStudioEnabled,
  shouldStartStudioProxy,
} from '~/plugins/drizzle-studio/index'

describe('drizzle studio plugin wiring', () => {
  it('enables studio in Vite serve outside Vitest', () => {
    expect(isDrizzleStudioEnabled({})).toBe(true)
    expect(isDrizzleStudioEnabled({
      VITEST: 'true',
    })).toBe(false)
  })

  it('does not start the loopback proxy in Vite middleware mode', () => {
    expect(shouldStartStudioProxy(true, undefined)).toBe(true)
    expect(shouldStartStudioProxy(true, true)).toBe(false)
    expect(shouldStartStudioProxy(false, undefined)).toBe(false)
  })

  it('registers the Nitro route and authorization replacement', () => {
    const options = {
      replace: {},
      routes: {},
    }

    configureDrizzleStudioNitro(options, 'studio-key')

    expect(options).toMatchObject({
      replace: {
        'import.meta.DRIZZLE_STUDIO_KEY': '"studio-key"',
      },
      routes: {
        '/api/drizzle-studio': {},
      },
    })
    expect(JSON.stringify(options.routes)).toMatch(
      /plugins\/drizzle-studio\/runtime\/server\/handler\.ts/,
    )
  })

  it('points the studio web app at the loopback proxy port', () => {
    expect(drizzleStudioUrl(4983)).toBe('https://local.drizzle.studio?port=4983')
  })
})
