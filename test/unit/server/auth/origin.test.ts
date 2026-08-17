import { describe, expect, it } from 'vitest'
import {
  graphqlTrustedOrigins,
  isAllowedGraphQLContentType,
  isTrustedGraphQLOrigin,
} from '~/server/auth/origin'

describe('isTrustedGraphQLOrigin', () => {
  const trusted = ['http://localhost:20398', 'https://app.example'] as const

  it('allows an exact trusted origin', () => {
    expect(isTrustedGraphQLOrigin('http://localhost:20398', trusted)).toBe(true)
  })

  it('rejects a missing origin', () => {
    expect(isTrustedGraphQLOrigin(null, trusted)).toBe(false)
    expect(isTrustedGraphQLOrigin('', trusted)).toBe(false)
  })

  it('rejects an untrusted origin', () => {
    expect(isTrustedGraphQLOrigin('https://evil.example', trusted)).toBe(false)
  })
})

describe('graphqlTrustedOrigins', () => {
  it('includes the Better Auth URL origin and configured trusted origins', () => {
    expect(graphqlTrustedOrigins({
      url: 'http://127.0.0.1:4123',
      trustedOrigins: ['https://app.example'],
      allowedHosts: ['localhost'],
    })).toEqual(['https://app.example', 'http://127.0.0.1:4123'])
  })

  it('does not duplicate the URL origin when it is already trusted', () => {
    expect(graphqlTrustedOrigins({
      url: 'https://app.example',
      trustedOrigins: ['https://app.example'],
      allowedHosts: ['app.example'],
    })).toEqual(['https://app.example'])
  })
})

describe('isAllowedGraphQLContentType', () => {
  it('allows application/json with parameters', () => {
    expect(isAllowedGraphQLContentType('application/json; charset=utf-8')).toBe(true)
  })

  it('allows application/graphql', () => {
    expect(isAllowedGraphQLContentType('application/graphql')).toBe(true)
  })

  it('rejects simple or missing content types', () => {
    expect(isAllowedGraphQLContentType(null)).toBe(false)
    expect(isAllowedGraphQLContentType('text/plain')).toBe(false)
    expect(isAllowedGraphQLContentType('application/x-www-form-urlencoded')).toBe(false)
  })
})
