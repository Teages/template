import type { $Fetch } from 'ofetch'
import type { AuthSession as ServerAuthSession } from '~/server/utils/session'
import { parseJSON } from 'better-auth/client'

export type AuthSession = ServerAuthSession

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function isAuthSession(value: unknown): value is AuthSession {
  if (!isRecord(value))
    return false
  const user = value.user
  const session = value.session
  if (!isRecord(user) || !isRecord(session))
    return false
  return typeof user.name === 'string'
    && typeof user.email === 'string'
    && typeof user.id === 'string'
    && typeof user.emailVerified === 'boolean'
    && user.createdAt instanceof Date
    && user.updatedAt instanceof Date
    && typeof session.id === 'string'
    && typeof session.userId === 'string'
    && typeof session.token === 'string'
    && session.createdAt instanceof Date
    && session.updatedAt instanceof Date
    && session.expiresAt instanceof Date
}

export async function fetchAuthSession($fetch: $Fetch): Promise<AuthSession | null> {
  const value: unknown = await $fetch('/api/auth/get-session', {
    parseResponse: text => parseJSON<unknown>(text, { strict: false }),
  })
  if (!isAuthSession(value))
    return null

  return value
}
