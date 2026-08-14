import { router } from '~/server/trpc/init'
import { countRouter } from '~/server/trpc/routers/count'

export const appRouter = router({
  count: countRouter,
})

export type AppRouter = typeof appRouter
