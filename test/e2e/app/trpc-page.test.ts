import { describe, expect, it } from 'vitest'
import { fetch } from '~/test/env-runner-bridge.ts'
import { cookieHeader, testOrigin, uniqueAuthEmail } from '~/test/utils'

describe('trpc demo page SSR', () => {
  it('redirects unauthenticated document requests to sign in', async () => {
    const res = await fetch('/trpc', {
      redirect: 'manual',
      headers: {
        Origin: testOrigin,
        Accept: 'text/html',
      },
    })

    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('/sign-in?redirect=%2Ftrpc')
  })

  it('renders the /trpc page for an authenticated user', async () => {
    const signUpResponse = await fetch('/api/auth/sign-up/email', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'origin': testOrigin,
      },
      body: JSON.stringify({
        email: uniqueAuthEmail('trpc-page'),
        password: 'password123',
        name: 'Vitest User',
      }),
    })
    expect(signUpResponse.status).toBe(200)
    const cookie = cookieHeader(signUpResponse)
    expect(cookie).not.toBe('')

    const res = await fetch('/trpc', {
      headers: {
        Origin: testOrigin,
        Accept: 'text/html',
        Cookie: cookie,
      },
    })
    const html = await res.text()

    expect(res.status, html.slice(0, 500)).toBe(200)
    expect(html).toContain('tRPC Demo')
    expect(html).toContain('greet.greet')
    expect(html).toContain('count.list')
  })

  it('shows the tRPC nav link on the home page', async () => {
    const res = await fetch('/', {
      headers: {
        Origin: testOrigin,
        Accept: 'text/html',
      },
    })
    const html = await res.text()

    expect(html).toContain('href="/trpc"')
  })
})
