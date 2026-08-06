import { router } from '~/server/trpc/init'
import { countRouter } from '~/server/trpc/routers/count'
import { greetRouter } from '~/server/trpc/routers/greet'

export const appRouter = router({
  greet: greetRouter,
  count: countRouter,
})

export type AppRouter = typeof appRouter
