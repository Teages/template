import { describe, expect, it } from 'vitest'
import {
  applyAuthSetCookies,
  cookieHeaderFromSetCookie,
  readSetCookieValues,
} from '~/server/auth/cookies'

describe('readSetCookieValues', () => {
  it('reads every Set-Cookie value from Better Auth headers', () => {
    const headers = new Headers()
    headers.append('set-cookie', 'better-auth.session_token=abc; Path=/; HttpOnly')
    headers.append('set-cookie', 'better-auth.session_data=xyz; Path=/')

    expect(readSetCookieValues(headers)).toEqual([
      'better-auth.session_token=abc; Path=/; HttpOnly',
      'better-auth.session_data=xyz; Path=/',
    ])
  })
})

describe('cookieHeaderFromSetCookie', () => {
  it('keeps only the name=value pairs for a follow-up Cookie header', () => {
    expect(cookieHeaderFromSetCookie([
      'better-auth.session_token=abc; Path=/; HttpOnly',
      'better-auth.session_data=xyz; Path=/',
    ])).toBe('better-auth.session_token=abc; better-auth.session_data=xyz')
  })
})

describe('applyAuthSetCookies', () => {
  it('appends collected Set-Cookie values onto the GraphQL response', () => {
    const response = new Response(JSON.stringify({ data: {} }), {
      headers: { 'content-type': 'application/json' },
    })

    const merged = applyAuthSetCookies(response, [
      'better-auth.session_token=abc; Path=/; HttpOnly',
    ])

    expect(merged.headers.get('content-type')).toBe('application/json')
    expect(merged.headers.getSetCookie()).toEqual([
      'better-auth.session_token=abc; Path=/; HttpOnly',
    ])
  })

  it('returns the original response when there are no cookies to forward', () => {
    const response = new Response('ok')
    expect(applyAuthSetCookies(response, [])).toBe(response)
  })
})
