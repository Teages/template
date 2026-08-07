import { describe, expect, it } from 'vitest'
import { authRedirectFor } from '~/app/utils/auth-routes'

const session = {
  user: {
    id: 'user-1',
    name: 'Test User',
    email: 'user@example.com',
  },
}

describe('authRedirectFor', () => {
  it('protects every API demo page for unauthenticated navigation', () => {
    expect(authRedirectFor('/', '/', null)).toBe('/sign-in?redirect=%2F')
    expect(authRedirectFor('/rest', '/rest?cursor=next', null))
      .toBe('/sign-in?redirect=%2Frest%3Fcursor%3Dnext')
    expect(authRedirectFor('/trpc', '/trpc', null))
      .toBe('/sign-in?redirect=%2Ftrpc')
  })

  it('allows authenticated navigation to every API demo page', () => {
    expect(authRedirectFor('/', '/', session)).toBeNull()
    expect(authRedirectFor('/rest', '/rest', session)).toBeNull()
    expect(authRedirectFor('/trpc', '/trpc', session)).toBeNull()
  })

  it('keeps sign-in and sign-up public without creating redirect loops', () => {
    expect(authRedirectFor('/sign-in', '/sign-in', null)).toBeNull()
    expect(authRedirectFor('/sign-up', '/sign-up', null)).toBeNull()
    expect(authRedirectFor('/sign-in', '/sign-in', session)).toBe('/')
    expect(authRedirectFor('/sign-up', '/sign-up', session)).toBe('/')
  })
})
