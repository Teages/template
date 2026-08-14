import type { H3Event } from 'nitro/h3'
import type { AuthSession } from '~/server/utils/session'
import { initTRPC, TRPCError } from '@trpc/server'
import { useAuthSession } from '~/server/utils/session'

/**
 * tRPC request context.
 *
 * `session` is optional — the auth middleware (server/middleware/auth.ts) has
 * already loaded and cached it by the time procedures run, so this is a cheap
 * cache read, not another DB/auth round-trip. Protected procedures enforce
 * non-null via {@link protectedProcedure}.
 */
export interface TRPCContext {
  readonly event: H3Event
  readonly session: AuthSession | null
}

export function createTRPCContext(event: H3Event): TRPCContext {
  return {
    event,
    session: useAuthSession(event, 'optional'),
  }
}

const t = initTRPC.context<TRPCContext>().create()

/** Procedure callable without authentication. */
export const publicProcedure = t.procedure

/**
 * Procedure that requires an authenticated Better Auth session.
 * Throws UNAUTHORIZED (→ HTTP 401) when no session is present, mirroring
 * `useAuthSession(event, 'required')` in the REST handlers.
 */
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Sign in to access this procedure.' })
  }
  return next({ ctx: { ...ctx, session: ctx.session } })
})

export const router = t.router
