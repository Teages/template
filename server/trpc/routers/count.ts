import { protectedProcedure, router } from '~/server/trpc/init'
import { getCountSnapshot, recordCountEvent } from '~/server/utils/count-events'
import { useDrizzle } from '~/server/utils/drizzle'

/**
 * Count router — mirrors the REST (`/api/count`) and GraphQL (`count` /
 * `recordCount`) surfaces so the same business logic is reachable three ways.
 *
 * Both procedures require a session; unauthenticated callers get UNAUTHORIZED.
 */
export const countRouter = router({
  /** Current total and the full event feed (newest first). */
  snapshot: protectedProcedure.query(() => {
    const { db } = useDrizzle()
    return getCountSnapshot(db)
  }),

  /** Records a new count event for the signed-in user, returns the updated snapshot. */
  record: protectedProcedure.mutation(({ ctx }) => {
    const { db } = useDrizzle()
    return recordCountEvent(db, ctx.session.user.id)
  }),
})
