import { defineHandler } from 'nitro/h3'
import { useAuth } from '~/server/utils/auth'

export default defineHandler(event => useAuth().handler(event.req))

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest

  describe('auth /api/auth', async () => {
    const { serverFetch } = await import('nitro/app')
    const { uniqueAuthEmail } = await import('~/test/utils.ts')

    const origin = 'http://localhost:20398'
    const jsonHeaders = {
      'Content-Type': 'application/json',
      Origin: origin,
    } as const

    function cookieHeader(res: Response): string {
      const setCookies = res.headers.getSetCookie?.() ?? []
      if (setCookies.length > 0) {
        return setCookies.map(c => c.split(';')[0]!).join('; ')
      }
      const legacy = res.headers.get('set-cookie')
      return legacy?.split(',').map(c => c.trim().split(';')[0]!).join('; ') ?? ''
    }

    it('returns no session when not signed in', async () => {
      const res = await serverFetch('/api/auth/get-session', {
        headers: { Origin: origin },
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
          Origin: origin,
          Cookie: cookieHeader(signInRes),
        },
      })

      expect(sessionRes.status).toBe(200)
      const session = await sessionRes.json() as { user: { email: string } } | null
      expect(session?.user.email).toBe(email)
    })
  })
}
