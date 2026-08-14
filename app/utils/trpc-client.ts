import type { $Fetch } from 'ofetch'
import type { AppRouter } from '~/server/trpc/root'
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client'

/**
 * Vanilla tRPC proxy client.
 *
 * Pass the app context's `$requestFetch`: it is browser-local on the client
 * and forwards SSR credentials only to relative internal routes.
 *
 * Usage:
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
