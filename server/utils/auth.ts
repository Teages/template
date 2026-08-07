import type { DrizzleDatabase } from './drizzle'
import { drizzleAdapter } from '@better-auth/drizzle-adapter/relations-v2'
import { betterAuth } from 'better-auth'
import { testUtils } from 'better-auth/plugins'
import { schema } from '../database/index'
import { useDrizzle } from './drizzle'

function parseEnvList(value: string | undefined): string[] {
  return value?.split(',').map(item => item.trim()).filter(Boolean) ?? []
}

function initAuth(db: DrizzleDatabase) {
  const allowedHosts = parseEnvList(import.meta.env.BETTER_AUTH_ALLOWED_HOSTS)

  return betterAuth({
    appName: 'Count App',
    emailAndPassword: {
      enabled: true,
    },
    trustedOrigins: [
      'http://localhost:20398',
      ...parseEnvList(import.meta.env.BETTER_AUTH_TRUSTED_ORIGINS),
    ],
    baseURL: {
      allowedHosts: allowedHosts.length > 0
        ? allowedHosts
        : ['localhost', 'localhost:*'],
      fallback: import.meta.env.BETTER_AUTH_URL ?? 'http://localhost:20398',
    },
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema,
      usePlural: true,
    }),
    plugins: import.meta.MOCK_DATABASE ? [testUtils()] : [],
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
