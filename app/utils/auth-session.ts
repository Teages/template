import type { useQueryCache } from '@pinia/colada'
import type { $Fetch } from 'ofetch'
import type { AuthSession as ServerAuthSession } from '~/server/utils/session'
import { parseJSON } from 'better-auth/client'
import { AUTH_SESSION_QUERY_KEY } from './query-keys'

export type AuthSession = ServerAuthSession

type QueryCache = ReturnType<typeof useQueryCache>

/** Cache handle shared by the navigation guard, the app header, and the auth pages. */
export interface AuthSessionStore {
  readonly queryCache: QueryCache
  readonly $requestFetch: $Fetch
}

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

/**
 * The session is fetched once at hydration by the navigation guard and kept
 * for the whole visit: guards read this cache instead of the network, and
 * sign-in/sign-out refresh it. Unlike better-auth's recommended setup, the
 * SSR payload does not embed the session, so the client cache has a single
 * writer and never serves stale payload data.
 */
export const AUTH_SESSION_STALE_TIME = Number.POSITIVE_INFINITY

export async function ensureAuthSession(store: AuthSessionStore): Promise<AuthSession | null> {
  const entry = store.queryCache.ensure({
    key: AUTH_SESSION_QUERY_KEY,
    query: () => fetchAuthSession(store.$requestFetch),
    staleTime: AUTH_SESSION_STALE_TIME,
  })
  // queryCache.fetch is an unconditional refetch: only run it while the
  // entry has never resolved or previously errored.
  if (entry.state.value.status !== 'success') {
    await store.queryCache.fetch(entry)
  }
  const value: unknown = store.queryCache.getQueryData(AUTH_SESSION_QUERY_KEY)
  return isAuthSession(value) ? value : null
}

export async function refreshAuthSession(store: AuthSessionStore): Promise<AuthSession | null> {
  const session = await fetchAuthSession(store.$requestFetch)
  store.queryCache.setQueryData(AUTH_SESSION_QUERY_KEY, session)
  return session
}
