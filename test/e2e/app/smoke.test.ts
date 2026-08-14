import { serverFetch } from 'nitro/app'
import { describe, expect, it } from 'vitest'
import { fetch } from '~/plugins/nitro-test/runtime/node/env-runner-bridge.ts'
import { cookieHeader, testOrigin, uniqueAuthEmail } from '~/test/utils'

describe('full stack smoke', () => {
  it('redirects unauthenticated document requests before rendering', async () => {
    const res = await fetch('/', {
      redirect: 'manual',
      headers: {
        Origin: testOrigin,
        Accept: 'text/html',
      },
    })
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('/sign-in?redirect=%2F')
  })

  it('serves unknown document routes with a 404 status', async () => {
    const email = uniqueAuthEmail('not-found')
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

    // Unauthenticated requests hit the auth gate (302) first, so the 404
    // contract is asserted with a signed-in session.
    const res = await fetch('/no/such/page', {
      headers: {
        Origin: testOrigin,
        Cookie: cookie,
        Accept: 'text/html',
      },
    })
    const html = await res.text()
    expect(res.status).toBe(404)
    expect(html).toContain('Page not found')
  })

  it('serves auth API with the full Vite plugin stack enabled', async () => {
    const res = await serverFetch('/api/auth/get-session', {
      headers: { Origin: testOrigin },
    })
    expect(res.status).toBe(200)
    expect(await res.json()).toBeNull()
  })
})
