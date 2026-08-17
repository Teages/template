import type { BetterAuthEnv } from '~/server/utils/auth-env'

const ALLOWED_GRAPHQL_MEDIA_TYPES = new Set([
  'application/json',
  'application/graphql',
])

export function isTrustedGraphQLOrigin(
  origin: string | null,
  trustedOrigins: readonly string[],
): boolean {
  if (!origin)
    return false
  return trustedOrigins.includes(origin)
}

export function graphqlTrustedOrigins(env: BetterAuthEnv): readonly string[] {
  const urlOrigin = new URL(env.url).origin
  if (env.trustedOrigins.includes(urlOrigin))
    return env.trustedOrigins
  return [...env.trustedOrigins, urlOrigin]
}

export function isAllowedGraphQLContentType(contentType: string | null): boolean {
  if (!contentType)
    return false
  const mediaType = contentType.split(';', 1)[0]?.trim().toLowerCase()
  return mediaType !== undefined && ALLOWED_GRAPHQL_MEDIA_TYPES.has(mediaType)
}
