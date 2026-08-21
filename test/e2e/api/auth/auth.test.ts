import { serverFetch } from 'nitro/app'
import { describe, expect, it } from 'vitest'
import { cookieHeader, jsonHeaders, testOrigin, uniqueAuthEmail } from '~/test/utils'

describe('auth /api/auth', () => {
  it('returns no session when not signed in', async () => {
    const res = await serverFetch('/api/auth/get-session', {
      headers: { Origin: testOrigin },
    })

    expect(res.status).toBe(200)
    expect(await res.json()).toBeNull()
  })

  it('signs up with email and password', async () => {
    const email = uniqueAuthEmail('sign-up')
    const res = await serverFetch('/api/auth/sign-up/email', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({
        name: 'Vitest User',
        email,
        password: 'password-8-chars',
      }),
    })

    expect(res.status).toBe(200)
    const body = await res.json() as { user: { email: string } }
    expect(body.user.email).toBe(email)
    expect(cookieHeader(res).length).toBeGreaterThan(0)
  })

  it('signs in and returns session for the authenticated user', async () => {
    const email = uniqueAuthEmail('sign-in')
    const password = 'password-8-chars'

    const signUpRes = await serverFetch('/api/auth/sign-up/email', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({
        name: 'Vitest User',
        email,
        password,
      }),
    })
    expect(signUpRes.status).toBe(200)

    const signInRes = await serverFetch('/api/auth/sign-in/email', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ email, password }),
    })

    expect(signInRes.status).toBe(200)
    const signInBody = await signInRes.json() as { user: { email: string } }
    expect(signInBody.user.email).toBe(email)

    const sessionRes = await serverFetch('/api/auth/get-session', {
      headers: {
        Origin: testOrigin,
        Cookie: cookieHeader(signInRes),
      },
    })

    expect(sessionRes.status).toBe(200)
    const session = await sessionRes.json() as { user: { email: string } } | null
    expect(session?.user.email).toBe(email)
  })
})
