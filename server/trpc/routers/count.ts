import { z } from 'zod'
import { useDrizzle } from '#drizzle'
import { protectedProcedure, router } from '~/server/trpc/init'
import { createCountEvent, listCountEvents } from '~/server/trpc/services/count'

/**
 * Count router exposes the same count-event business capabilities as the REST
 * and GraphQL examples using conventional tRPC procedures and inferred types.
 *
 * Both procedures require a session; unauthenticated callers get UNAUTHORIZED.
 */
export const countRouter = router({
  list: protectedProcedure
    .input(z.object({
      limit: z.number().int().min(1).max(100).default(20),
      cursor: z.uuid().nullish(),
    }).optional())
    .query(({ input }) => listCountEvents(useDrizzle().db, {
      limit: input?.limit ?? 20,
      cursor: input?.cursor ?? undefined,
    })),

  create: protectedProcedure.mutation(({ ctx }) =>
    createCountEvent(useDrizzle().db, ctx.session.user)),
})
