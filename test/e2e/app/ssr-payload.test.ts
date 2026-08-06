import { serverFetch } from 'nitro/app'
import { describe, expect, it } from 'vitest'
import { parsePayloadScript } from '~/app/utils/payload.ts'
import { fetch } from '~/test/env-runner-bridge.ts'
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
        query: 'mutation { recordCount { id } }',
      }),
    })
    expect(recordRes.status).toBe(200)
    expect(await recordRes.json()).toEqual({
      data: { recordCount: { id: expect.any(String) } },
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
    expect(payload.data['auth:session']).toEqual(
      expect.objectContaining({
        user: expect.objectContaining({
          email,
          name: 'Vitest User',
        }),
      }),
    )
    expect(payload.data['count-snapshot']).toEqual(
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
      (payload.data['count-snapshot'] as { count: number }).count,
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
