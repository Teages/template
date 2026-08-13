import { describe, expect, it } from 'vitest'
import { createApp } from 'vue'
import {
  createAppPayload,
  installDataLayer,
} from '~/plugins/vue-ssr/runtime/app/data-layer'
import {
  parsePayloadScript,
  serializePayloadScript,
} from '~/plugins/vue-ssr/runtime/app/payload'

describe('data layer', () => {
  it('hydrates query data without sharing caches between apps', () => {
    const serverApp = createApp({ render: () => null })
    const server = installDataLayer(serverApp, { ssr: true })
    server.queryCache.setQueryData(['snapshot'], { count: 7 })

    const payload = parsePayloadScript(serializePayloadScript(
      createAppPayload(server.pinia, server.queryCache),
    ))

    const clientApp = createApp({ render: () => null })
    const client = installDataLayer(clientApp, { payload })

    expect(client.queryCache).not.toBe(server.queryCache)
    expect(client.queryCache.getQueryData(['snapshot'])).toEqual({ count: 7 })

    client.queryCache.setQueryData(['snapshot'], { count: 8 })
    expect(server.queryCache.getQueryData(['snapshot'])).toEqual({ count: 7 })
  })
})
