import type { EntryKey, UseInfiniteQueryData } from '@pinia/colada'
import type { AppPayload } from '~/app/utils/payload'
import { serverFetch } from 'nitro/app'
import { describe, expect, it } from 'vitest'
import { createApp } from 'vue'
import { installDataLayer } from '~/app/utils/data-layer'
import { parsePayloadScript } from '~/app/utils/payload'
import { AUTH_SESSION_QUERY_KEY, COUNT_QUERY_KEYS } from '~/app/utils/query-keys'
import { fetch } from '~/test/env-runner-bridge'
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
      data: { recordCount: { countEvent: { id: expect.any(String) } } },
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
      expect.objectContaining({
        user: expect.objectContaining({
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
      expect.objectContaining({
        count: expect.any(Number),
        events: expect.arrayContaining([
          expect.objectContaining({
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
    expect(res.status).toBe(404)
    expect(html.includes('__APP_PAYLOAD__')).toBe(false)
  })
})

function getQueryData<T = unknown>(payload: AppPayload, key: EntryKey): T | undefined {
  const app = createApp({ render: () => null })
  const { queryCache } = installDataLayer(app, { payload })
  return queryCache.getQueryData<T>(key)
}
