import type { DrizzleDatabase } from '~/server/utils/drizzle'
import { drizzleAdapter } from '@better-auth/drizzle-adapter/relations-v2'
import { betterAuth } from 'better-auth'
import { testUtils } from 'better-auth/plugins'
import { useDrizzle } from '~/server/utils/drizzle'
import { schema } from '../database'

type Auth = ReturnType<typeof initAuth>
function initAuth(db: DrizzleDatabase) {
  return betterAuth({
    appName: 'TODOs',
    emailAndPassword: {
      enabled: true,
    },
    trustedOrigins: [
      'http://localhost:20397',
      'http://localhost:20398',
    ],
    baseURL: {
      allowedHosts: ['localhost', 'localhost:*'],
      fallback: 'http://localhost:20398',
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
