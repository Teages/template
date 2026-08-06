import type { DrizzleDatabase } from './drizzle'
import { drizzleAdapter } from '@better-auth/drizzle-adapter/relations-v2'
import { betterAuth } from 'better-auth'
import { testUtils } from 'better-auth/plugins'
import { schema } from '../database/index'
import { useDrizzle } from './drizzle'

function trustedOrigins(): readonly string[] {
  const trusted = import.meta.env.BETTER_AUTH_TRUSTED_ORIGINS
  const configured = trusted
    ?.split(',')
    .map((origin: string) => origin.trim())
    .filter(Boolean) ?? []

  return [
    'http://localhost:20398',
    ...configured,
  ]
}

function initAuth(db: DrizzleDatabase) {
  return betterAuth({
    appName: 'Count App',
    emailAndPassword: {
      enabled: true,
    },
    trustedOrigins: [...trustedOrigins()],
    baseURL: {
      allowedHosts: import.meta.env.BETTER_AUTH_ALLOWED_HOSTS?.split(',').map((host: string) => host.trim()).filter(Boolean) ?? ['localhost', 'localhost:*'],
      fallback: import.meta.env.BETTER_AUTH_URL ?? 'http://localhost:20398',
    },
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema,
      usePlural: true,
    }),
    plugins: [
      ...(import.meta.MOCK_DATABASE ? [testUtils()] : []) as [ReturnType<typeof testUtils>],
    ],
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
