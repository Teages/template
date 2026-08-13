import type { $Fetch } from 'ofetch'
import { createFetch } from 'ofetch'

export interface SsrFetchContext {
  /** Plain ofetch: resolves internal paths but never inherits browser credentials. */
  $fetch: $Fetch
  /** Request-aware ofetch: inherits the cookie only for internal relative paths. */
  $requestFetch: $Fetch
}

type FetchInput = Parameters<typeof globalThis.fetch>[0]

function resolveInternalPath(input: FetchInput, origin: string): URL | null {
  if (
    typeof input !== 'string'
    || !input.startsWith('/')
    || input.startsWith('//')
  ) {
    return null
  }

  const target = new URL(input, origin)
  return target.origin === origin ? target : null
}

function createSsrNativeFetch(
  request: Request,
  transport: typeof globalThis.fetch,
  forwardCookie: boolean,
): typeof globalThis.fetch {
  const origin = new URL(request.url).origin
  const requestCookie = request.headers.get('cookie')

  return (input: FetchInput, init?: RequestInit): Promise<Response> => {
    const internalTarget = resolveInternalPath(input, origin)
    const target = internalTarget ?? input
    const headers = new Headers(
      init?.headers
      ?? (input instanceof Request ? input.headers : undefined),
    )

    if (forwardCookie && internalTarget && requestCookie && !headers.has('cookie'))
      headers.set('cookie', requestCookie)

    return transport(target, { ...init, headers })
  }
}

/**
 * Create the two SSR fetch capabilities used by the Vue app.
 *
 * Ordinary `$fetch` never inherits browser credentials. Request-aware fetch
 * forwards them only to a relative internal route. Absolute and
 * protocol-relative targets remain external even at the document origin.
 */
export function createSsrFetchContext(
  request: Request,
  transport: typeof globalThis.fetch,
): SsrFetchContext {
  return {
    $fetch: createFetch({
      fetch: createSsrNativeFetch(request, transport, false),
    }),
    $requestFetch: createFetch({
      fetch: createSsrNativeFetch(request, transport, true),
    }),
  }
}
