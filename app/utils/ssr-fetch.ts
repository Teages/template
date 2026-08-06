import type { $Fetch } from 'ofetch'
import { createFetch } from 'ofetch'

export interface SsrFetchContext {
  /** Plain ofetch: resolves internal paths but never inherits browser credentials. */
  $fetch: $Fetch
  /** Request-aware ofetch: inherits the cookie only for internal relative paths. */
  $requestFetch: $Fetch
}

function isInternalPath(input: RequestInfo | URL): input is string {
  return typeof input === 'string'
    && input.startsWith('/')
    && !input.startsWith('//')
}

function createSsrNativeFetch(
  request: Request,
  transport: typeof globalThis.fetch,
  forwardCookie: boolean,
): typeof globalThis.fetch {
  const origin = new URL(request.url).origin
  const requestCookie = request.headers.get('cookie')

  return (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const internal = isInternalPath(input)
    const target = internal ? new URL(input, origin) : input
    const headers = new Headers(
      init?.headers
      ?? (input instanceof Request ? input.headers : undefined),
    )

    if (forwardCookie && internal && requestCookie && !headers.has('cookie'))
      headers.set('cookie', requestCookie)

    return transport(target, { ...init, headers })
  }
}

/**
 * Create the two SSR fetch capabilities used by the Vue app.
 *
 * This mirrors Nuxt's security boundary: ordinary `$fetch` never inherits
 * browser credentials, while request-aware fetch only forwards them to a
 * relative internal route. Absolute and protocol-relative targets are always
 * treated as external, even when they happen to share the document origin.
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
