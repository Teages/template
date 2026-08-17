import type { H3Event } from 'nitro/h3'
import type { AuthRateLimitOperation } from '~/server/auth/rate-limit'
import type { schema } from '~/server/database/index'
import { getRequestIP } from 'nitro/h3'
import { collectAuthSetCookies, cookieHeaderFromSetCookie, readSetCookieValues } from '~/server/auth/cookies'
import { mapBetterAuthError } from '~/server/auth/map-api-error'
import { consumeAuthRateLimit } from '~/server/auth/rate-limit'
import { useAuthRateLimitStorage } from '~/server/auth/rate-limit-storage'
import { RateLimitedError } from '~/server/graphql/errors'
import { useAuth } from '~/server/utils/auth'
import { useDrizzle } from '~/server/utils/drizzle'
import { replaceAuthSession } from '~/server/utils/session'

export interface SignInEmailInput {
  readonly email: string
  readonly password: string
  readonly rememberMe?: boolean
}

export interface SignUpEmailInput {
  readonly name: string
  readonly email: string
  readonly password: string
  readonly rememberMe?: boolean
}

export async function signInEmail(
  event: H3Event,
  input: SignInEmailInput,
): Promise<{ readonly user: typeof schema.users.$inferSelect }> {
  await consumeSensitiveAuthLimit(event, 'signInEmail', input.email)
  try {
    const { response, headers } = await useAuth().api.signInEmail({
      body: {
        email: input.email,
        password: input.password,
        ...(input.rememberMe === undefined ? {} : { rememberMe: input.rememberMe }),
      },
      headers: event.req.headers,
      returnHeaders: true,
    })
    await settleAuthCookies(event, headers)
    return { user: await loadUserRow(response.user.id) }
  }
  catch (error) {
    return mapBetterAuthError(error)
  }
}

export async function signUpEmail(
  event: H3Event,
  input: SignUpEmailInput,
): Promise<{ readonly user: typeof schema.users.$inferSelect }> {
  await consumeSensitiveAuthLimit(event, 'signUpEmail', input.email)
  try {
    const { response, headers } = await useAuth().api.signUpEmail({
      body: {
        name: input.name,
        email: input.email,
        password: input.password,
        ...(input.rememberMe === undefined ? {} : { rememberMe: input.rememberMe }),
      },
      headers: event.req.headers,
      returnHeaders: true,
    })
    await settleAuthCookies(event, headers)
    return { user: await loadUserRow(response.user.id) }
  }
  catch (error) {
    return mapBetterAuthError(error)
  }
}

export async function signOut(event: H3Event): Promise<{ readonly ok: true }> {
  await consumeSensitiveAuthLimit(event, 'signOut')
  try {
    const { headers } = await useAuth().api.signOut({
      headers: event.req.headers,
      returnHeaders: true,
    })
    collectAuthSetCookies(event, headers)
    replaceAuthSession(event, null)
    return { ok: true }
  }
  catch (error) {
    return mapBetterAuthError(error)
  }
}

async function consumeSensitiveAuthLimit(
  event: H3Event,
  operation: AuthRateLimitOperation,
  email?: string,
): Promise<void> {
  const allowed = await consumeAuthRateLimit({
    operation,
    ip: getRequestIP(event) ?? 'unknown',
    ...(email === undefined ? {} : { email }),
  }, useAuthRateLimitStorage())
  if (!allowed)
    throw new RateLimitedError()
}

async function settleAuthCookies(event: H3Event, headers: Headers): Promise<void> {
  collectAuthSetCookies(event, headers)
  const cookie = cookieHeaderFromSetCookie(readSetCookieValues(headers))
  const nextHeaders = new Headers(event.req.headers)
  if (cookie) {
    const existing = nextHeaders.get('cookie')
    nextHeaders.set('cookie', existing ? `${existing}; ${cookie}` : cookie)
  }
  const session = await useAuth().api.getSession({ headers: nextHeaders })
  replaceAuthSession(event, session)
}

export async function loadUserRow(userId: string): Promise<typeof schema.users.$inferSelect> {
  const { db } = useDrizzle()
  const user = await db.query.users.findFirst({
    where: { id: userId },
  })
  if (!user)
    throw new Error('Authentication failed')
  return user
}
