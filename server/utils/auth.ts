import type { DrizzleDatabase } from './drizzle'
import { drizzleAdapter } from '@better-auth/drizzle-adapter/relations-v2'
import { betterAuth } from 'better-auth'
import { testUtils } from 'better-auth/plugins'
import { schema } from '../database/index'
import { readBetterAuthEnv } from './auth-env'
import { useDrizzle } from './drizzle'

function initAuth(db: DrizzleDatabase) {
  const authEnv = readBetterAuthEnv()
  const isTest = import.meta.env.NODE_ENV === 'test' || !!import.meta.env.VITEST

  return betterAuth({
    appName: 'Count App',
    emailAndPassword: {
      enabled: true,
    },
    trustedOrigins: [...authEnv.trustedOrigins],
    baseURL: {
      allowedHosts: [...authEnv.allowedHosts],
      fallback: authEnv.url,
    },
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema,
      usePlural: true,
    }),
    // testUtils serves local dev/test debugging; a MOCK production build
    // (import.meta.dev false, e.g. smoke artifacts) must not expose it.
    plugins: import.meta.MOCK_DATABASE && (import.meta.dev || isTest)
      ? [testUtils()]
      : [],
  })
}

export function createAuthForDatabase(db: DrizzleDatabase) {
  return initAuth(db)
}

let authInstance: ReturnType<typeof initAuth> | null = null

export function useAuth() {
  authInstance ??= initAuth(useDrizzle().db)
  return authInstance
}

/**
 * @deprecated Only for Better Auth CLI.
 */
export const auth = initAuth({} as never)
