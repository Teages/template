import type { AppRouter } from '~/server/trpc/root'
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client'

/**
 * Vanilla tRPC proxy client.
 *
 * The relative `/api/trpc` URL works on the client (browser fetch) and during
 * SSR — entry-server.ts patches `globalThis.fetch` to forward cookies and
 * resolve relative paths against the request origin.
 *
 * Usage:
 *   const result = await trpc.greet.greet.query({ name: 'World' })
 *   const snapshot = await trpc.count.snapshot.query()
 *   await trpc.count.record.mutate()
 */
export const trpc = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({ url: '/api/trpc' }),
  ],
})
