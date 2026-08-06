import type { $Fetch } from 'ofetch'
import type { AppRouter } from '~/server/trpc/root'
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client'

/**
 * Vanilla tRPC proxy client.
 *
 * The injected `$fetch` is browser-local on the client and request-scoped
 * during SSR, so relative URLs and cookies work without global mutation.
 *
 * Usage:
 *   const result = await trpc.greet.greet.query({ name: 'World' })
 *   const page = await trpc.count.list.query({ limit: 20 })
 *   await trpc.count.create.mutate()
 */
export function createTRPCClient($fetch: $Fetch) {
  return createTRPCProxyClient<AppRouter>({
    links: [
      httpBatchLink({
        url: '/api/trpc',
        fetch: $fetch.native,
      }),
    ],
  })
}
