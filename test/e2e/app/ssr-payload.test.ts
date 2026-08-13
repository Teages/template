import type { EntryKey, UseInfiniteQueryData } from '@pinia/colada'
import type { DeeplyAllowMatchers } from 'vitest'
import type { AppPayload } from '~/plugins/vue-ssr/runtime/app/payload.ts'
import { serverFetch } from 'nitro/app'
import { describe, expect, it } from 'vitest'
import { createApp } from 'vue'
import { AUTH_SESSION_QUERY_KEY, COUNT_QUERY_KEYS } from '~/app/utils/query-keys'
import { fetch } from '~/plugins/nitro-test/runtime/node/env-runner-bridge.ts'
import { installDataLayer } from '~/plugins/vue-ssr/runtime/app/data-layer.ts'
import { parsePayloadScript } from '~/plugins/vue-ssr/runtime/app/payload.ts'
import { cookieHeader, testOrigin, uniqueAuthEmail } from '~/test/utils'

describe('ssr app payload', () => {
  it('embeds hydrated count snapshot for an authenticated document request', async () => {
    const email = uniqueAuthEmail('ssr-payload')
    const signUpRes = await fetch('/api/auth/sign-up/email', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'origin': testOrigin,
      },
      body: JSON.stringify({
        email,
        password: 'password123',
        name: 'Vitest User',
      }),
    })
    expect(signUpRes.status).toBe(200)
    const cookie = cookieHeader(signUpRes)
    expect(cookie.length).toBeGreaterThan(0)

    const recordRes = await fetch('/api/graphql', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'origin': testOrigin,
        'cookie': cookie,
      },
      body: JSON.stringify({
        query: 'mutation { recordCount { countEvent { id } } }',
      }),
    })
    expect(recordRes.status).toBe(200)
    expect(await recordRes.json()).toEqual({
      data: { recordCount: { countEvent: { id: anyString() } } },
    })

    const res = await fetch('/', {
      headers: {
        Origin: testOrigin,
        Cookie: cookie,
        Accept: 'text/html',
      },
    })
    const html = await res.text()
    expect(res.status).toBe(200)
    expect(html).toContain('id="__APP_PAYLOAD__"')
    expect(html).toContain('Count:')
    expect(html).toContain('Vitest User')
    expect(html).not.toContain('No counts yet. Be the first to click.')

    const payload = parsePayloadScript(html)
    expect(getQueryData(payload, AUTH_SESSION_QUERY_KEY)).toEqual(
      objectContaining({
        user: objectContaining({
          email,
          name: 'Vitest User',
        }),
      }),
    )
    const countData = getQueryData<UseInfiniteQueryData<{
      count: number
      events: Array<{ userName: string }>
    }, string | null>>(payload, COUNT_QUERY_KEYS.graphql)
    expect(countData?.pages[0]).toEqual(
      objectContaining({
        count: anyNumber(),
        events: arrayContaining([
          objectContaining({
            userName: 'Vitest User',
          }),
        ]),
      }),
    )
    expect(
      countData?.pages[0]?.count,
    ).toBeGreaterThanOrEqual(1)
  })

  it('does not serve document SSR through in-process serverFetch', async () => {
    const res = await serverFetch('/', {
      headers: {
        Origin: testOrigin,
        Accept: 'text/html',
      },
    })
    const html = await res.text()
    // serverFetch is the in-process `useNitroApp().fetch` path; it cannot
    // reach the SSR renderer because the env-runner split keeps renderer
    // state out of hand (see plugins/nitro-test/runtime/node/env-runner-bridge.ts for the loopback-HTTP
    // path used to test actual document rendering). Whatever non-200 it
    // resolves to — 404 on unmatched routes, a renderer-stack failure page
    // when the Nitro version tries the ssr renderer as a fallback — it must
    // never produce a rendered SSR document.
    expect(res.status).toBeGreaterThanOrEqual(400)
    expect(html.includes('__APP_PAYLOAD__')).toBe(false)
  })
})

function anyString(): string {
  return expect.any(String) as string
}

function anyNumber(): number {
  return expect.any(Number) as number
}

function objectContaining<T extends object>(value: DeeplyAllowMatchers<T>): T {
  return expect.objectContaining(value) as T
}

function arrayContaining<T>(value: Array<DeeplyAllowMatchers<T>>): T[] {
  return expect.arrayContaining(value) as T[]
}

function getQueryData<T = unknown>(payload: AppPayload, key: EntryKey): T | undefined {
  const app = createApp({ render: () => null })
  const { queryCache } = installDataLayer(app, { payload })
  return queryCache.getQueryData<T>(key)
}
