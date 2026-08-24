import type { DrizzleDatabase } from '@teages/nitro-drizzle/runtime'
import { drizzleAdapter } from '@better-auth/drizzle-adapter/relations-v2'
import { useDrizzle } from '@teages/nitro-drizzle/runtime'
import { betterAuth } from 'better-auth'
import { testUtils } from 'better-auth/plugins'
import * as schema from '../database/schema'
import { readBetterAuthEnv } from './auth-env'

function initAuth(db: DrizzleDatabase) {
  const authEnv = readBetterAuthEnv()

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
    // testUtils serves local dev/test debugging against the disposable dev
    // database; a production build (import.meta.dev false) must not expose it.
    plugins: import.meta.dev && import.meta.env.NITRO_DRIZZLE_DEV !== false
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
