import type { H3Event } from 'nitro/h3'

const PENDING_SET_COOKIE = new WeakMap<H3Event, readonly string[]>()

export function readSetCookieValues(headers: Headers): readonly string[] {
  return headers.getSetCookie()
}

export function cookieHeaderFromSetCookie(setCookies: readonly string[]): string {
  return setCookies
    .map(entry => entry.split(';')[0]?.trim())
    .filter((part): part is string => Boolean(part))
    .join('; ')
}

export function collectAuthSetCookies(event: H3Event, headers: Headers): void {
  const incoming = readSetCookieValues(headers)
  if (incoming.length === 0)
    return
  const existing = PENDING_SET_COOKIE.get(event) ?? []
  PENDING_SET_COOKIE.set(event, [...existing, ...incoming])
}

export function takeCollectedAuthSetCookies(event: H3Event): readonly string[] {
  const cookies = PENDING_SET_COOKIE.get(event) ?? []
  PENDING_SET_COOKIE.delete(event)
  return cookies
}

export function applyAuthSetCookies(
  response: Response,
  setCookies: readonly string[],
): Response {
  if (setCookies.length === 0)
    return response

  const headers = new Headers(response.headers)
  for (const cookie of setCookies)
    headers.append('set-cookie', cookie)

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}
