import { env } from 'node:process'

export const DEFAULT_BETTER_AUTH_URL = 'http://localhost:20398' as const
export const DEFAULT_BETTER_AUTH_ALLOWED_HOSTS = ['localhost', 'localhost:*'] as const

export type BetterAuthEnvSource = Readonly<Record<string, string | undefined>>

export interface BetterAuthEnv {
  readonly url: string
  readonly trustedOrigins: readonly string[]
  readonly allowedHosts: readonly string[]
}

export function parseEnvList(value: string | undefined): readonly string[] {
  return value?.split(',').map(item => item.trim()).filter(Boolean) ?? []
}

export function readBetterAuthEnv(
  source: BetterAuthEnvSource = env,
): BetterAuthEnv {
  const allowedHosts = parseEnvList(source.BETTER_AUTH_ALLOWED_HOSTS)

  return {
    url: source.BETTER_AUTH_URL?.trim() || DEFAULT_BETTER_AUTH_URL,
    trustedOrigins: [
      DEFAULT_BETTER_AUTH_URL,
      ...parseEnvList(source.BETTER_AUTH_TRUSTED_ORIGINS),
    ],
    allowedHosts: allowedHosts.length > 0
      ? allowedHosts
      : DEFAULT_BETTER_AUTH_ALLOWED_HOSTS,
  }
}
