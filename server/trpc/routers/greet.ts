import { z } from 'zod'
import { publicProcedure, router } from '~/server/trpc/init'

/**
 * Simple public router for demonstrating tRPC end-to-end.
 *
 * `greet.greet` is callable without authentication so the /trpc demo page works
 * even when signed out.
 */
export const greetRouter = router({
  /**
   * Returns a greeting for the given name.
   *
   * @example
   * await trpc.greet.greet.query({ name: 'World' })
   * // → { greeting: 'Hello, World!' }
   */
  greet: publicProcedure
    .input(z.object({ name: z.string().min(1).max(100) }))
    .query(({ input }) => ({
      greeting: `Hello, ${input.name}!`,
      at: new Date().toISOString(),
    })),
})
