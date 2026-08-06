import type { H3Event } from 'nitro/h3'
import { HTTPError } from 'nitro/h3'
import { useAuth } from './auth'

type AuthSession = NonNullable<Awaited<ReturnType<typeof fetchAuthSession>>>

const CACHE_MAP = new WeakMap<H3Event, AuthSession | null>()

async function fetchAuthSession(event: H3Event) {
  return await useAuth().api.getSession({
    headers: event.req.headers,
  })
}

export async function loadAuthSession(event: H3Event): Promise<AuthSession | null> {
  if (!CACHE_MAP.has(event)) {
    CACHE_MAP.set(event, await fetchAuthSession(event))
  }
  return CACHE_MAP.get(event)!
}

export function useAuthSession(event: H3Event, mode: 'required'): AuthSession
export function useAuthSession(event: H3Event, mode: 'optional'): AuthSession | null
export function useAuthSession(event: H3Event, mode: 'optional' | 'required'): AuthSession | null {
  const res = CACHE_MAP.get(event)

  if (res === undefined) {
    throw new Error('Auth session not loaded.')
  }

  if (!res && mode === 'required') {
    throw HTTPError.status(401, 'Unauthorized')
  }

  return res
}
