import { describe, expect, it } from 'vitest'
import { readBetterAuthEnv } from '~/server/utils/auth-env'

describe('readBetterAuthEnv', () => {
  it('uses BETTER_AUTH_URL from the env source when set', () => {
    const result = readBetterAuthEnv({
      BETTER_AUTH_URL: 'https://example.com',
    })

    expect(result.url).toBe('https://example.com')
  })

  it('falls back to the Vite dev origin when BETTER_AUTH_URL is missing or blank', () => {
    expect(readBetterAuthEnv({}).url).toBe('http://localhost:20398')
    expect(readBetterAuthEnv({ BETTER_AUTH_URL: '   ' }).url).toBe('http://localhost:20398')
  })

  it('keeps the Vite dev origin and appends BETTER_AUTH_TRUSTED_ORIGINS', () => {
    const result = readBetterAuthEnv({
      BETTER_AUTH_TRUSTED_ORIGINS: 'https://a.example, https://b.example',
    })

    expect(result.trustedOrigins).toEqual([
      'http://localhost:20398',
      'https://a.example',
      'https://b.example',
    ])
  })

  it('uses BETTER_AUTH_ALLOWED_HOSTS when set and localhost defaults otherwise', () => {
    expect(readBetterAuthEnv({
      BETTER_AUTH_ALLOWED_HOSTS: 'example.com, example.com:*',
    }).allowedHosts).toEqual(['example.com', 'example.com:*'])

    expect(readBetterAuthEnv({}).allowedHosts).toEqual(['localhost', 'localhost:*'])
  })
})
