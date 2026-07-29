import type { DrizzleDatabase } from '~/server/utils/drizzle'
import { drizzleAdapter } from '@better-auth/drizzle-adapter/relations-v2'
import { betterAuth } from 'better-auth'
import { testUtils } from 'better-auth/plugins'
import { useDrizzle } from '~/server/utils/drizzle'
import { schema } from '../database'

type Auth = ReturnType<typeof initAuth>

function trustedOrigins() {
  const trusted = import.meta.env.BETTER_AUTH_TRUSTED_ORIGINS
  const configured = trusted
    ?.split(',')
    .map(origin => origin.trim())
    .filter(Boolean) ?? []

  return [
    'http://localhost:20397',
    'http://localhost:20398',
    ...configured,
  ]
}

function initAuth(db: DrizzleDatabase) {
  return betterAuth({
    appName: 'TODOs',
    emailAndPassword: {
      enabled: true,
    },
    trustedOrigins: trustedOrigins(),
    baseURL: {
      allowedHosts: import.meta.env.BETTER_AUTH_ALLOWED_HOSTS?.split(',').map(host => host.trim()).filter(Boolean) ?? ['localhost', 'localhost:*'],
      fallback: import.meta.env.BETTER_AUTH_URL ?? 'http://localhost:20398',
    },
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema,
      usePlural: true,
    }),
    plugins: [
      // keep non-mock enticement safe
      ...(import.meta.MOCK_DATABASE ? [testUtils()] : []) as [ReturnType<typeof testUtils>],
    ],
  })
}

/** Creates a Better Auth instance bound to a specific database (E2E seed, isolated tests). */
export function createAuthForDatabase(db: DrizzleDatabase): Auth {
  return initAuth(db)
}

let authInstance: Auth | null = null
/** Lazily creates Better Auth with the live Drizzle connection. */
export function useAuth(): Auth {
  authInstance ??= initAuth(useDrizzle().db)
  return authInstance
}

/**
 * @deprecated Only for Better Auth CLI.
 */
export const auth = initAuth({} as never)

if (import.meta.vitest) {
  const { describe, expect, it, vi, beforeEach, afterEach } = import.meta.vitest

  describe('trustedOrigins', () => {
    const KEY = 'BETTER_AUTH_TRUSTED_ORIGINS'
    const DEFAULTS = ['http://localhost:20397', 'http://localhost:20398']

    let original: string | undefined
    let existed: boolean

    beforeEach(() => {
      original = import.meta.env[KEY]
      existed = Object.hasOwn(import.meta.env, KEY)
    })

    afterEach(() => {
      vi.unstubAllEnvs()
      if (existed) {
        import.meta.env[KEY] = original
      }
      else {
        delete import.meta.env[KEY]
      }
    })

    it('returns only localhost defaults when the env var is unset', () => {
      delete import.meta.env[KEY]
      expect(trustedOrigins()).toEqual(DEFAULTS)
    })

    it('returns only localhost defaults when the env var is an empty string', () => {
      vi.stubEnv(KEY, '')
      expect(trustedOrigins()).toEqual(DEFAULTS)
    })

    it('appends a single configured origin after the defaults', () => {
      vi.stubEnv(KEY, 'https://example.com')
      expect(trustedOrigins()).toEqual([...DEFAULTS, 'https://example.com'])
    })

    it('parses multiple comma-separated origins and trims surrounding whitespace', () => {
      vi.stubEnv(KEY, ' https://a.com , https://b.com ')
      expect(trustedOrigins()).toEqual([...DEFAULTS, 'https://a.com', 'https://b.com'])
    })

    it('drops empty entries produced by consecutive or trailing commas', () => {
      vi.stubEnv(KEY, ', , https://c.com ,')
      expect(trustedOrigins()).toEqual([...DEFAULTS, 'https://c.com'])
    })
  })
}
