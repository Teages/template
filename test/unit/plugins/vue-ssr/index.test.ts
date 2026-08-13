import { describe, expect, it } from 'vitest'
import {
  vueAssetsQuery,
  vueSsrEnvironmentConfig,
  vueSsrPlugin,
} from '~/plugins/vue-ssr/index'

describe('vue SSR plugin wiring', () => {
  it('owns the client and SSR build entries', () => {
    expect(vueSsrEnvironmentConfig).toEqual({
      environments: {
        client: {
          build: {
            rollupOptions: {
              input: './plugins/vue-ssr/runtime/app/entry-client.ts',
            },
          },
        },
        ssr: {
          build: {
            rollupOptions: {
              input: './plugins/vue-ssr/runtime/app/entry-server.ts',
            },
          },
        },
      },
    })
  })

  it('keeps asset queries outside the Vue transform', () => {
    expect(vueAssetsQuery.test('/app/page.vue?assets')).toBe(true)
    expect(vueAssetsQuery.test('/app/page.vue')).toBe(false)
  })

  it('returns the Vue transform and SSR configuration plugins', () => {
    expect(vueSsrPlugin()).toMatchObject([
      { name: 'vite:vue' },
      { name: 'internal:vue-ssr' },
    ])
  })
})
