import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import { defineHandler } from 'nitro/h3'
import { createTRPCContext } from '~/server/trpc/init'
import { appRouter } from '~/server/trpc/root'
import { logger } from '~/server/utils/logger'

/**
 * tRPC HTTP endpoint mounted at /api/trpc/* via the fetch adapter.
 *
 * `event.req` is a standard web Request (h3 v2), so it is passed straight to
 * `fetchRequestHandler`. The context closes over the H3 event so procedures can
 * reach the (already-cached) auth session through {@link createTRPCContext}.
 */
export default defineHandler(async (event) => {
  const isTest = import.meta.env.NODE_ENV === 'test' || !!import.meta.env.VITEST

  return await fetchRequestHandler({
    endpoint: '/api/trpc',
    req: event.req,
    router: appRouter,
    createContext: () => createTRPCContext(event),
    responseMeta() {
      return {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    },
    onError: import.meta.dev || isTest
      ? ({ path, error }) => logger.error(`[tRPC] ${path ?? '<unknown>'}:`, error)
      : undefined,
  })
})
