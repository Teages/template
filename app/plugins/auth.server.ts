import { defineVuePlugin } from '~/plugins/vue-ssr/runtime/app/vue-plugin'
import { authRedirectFor } from '../utils/auth-routes'
import { fetchAuthSession } from '../utils/auth-session'

export default defineVuePlugin(async (context) => {
  if (context.environment !== 'server') {
    throw new TypeError('The server auth plugin requires a server context')
  }

  // The session only gates the redirect decision here; the client refetches
  // it once at hydration (see app/utils/auth-session.ts) instead of trusting
  // an SSR-payload value, so it is never written into the query cache.
  const session = await fetchAuthSession(context.appContext.$requestFetch)
  const url = new URL(context.request.url)
  const redirect = authRedirectFor(
    url.pathname,
    `${url.pathname}${url.search}`,
    session,
  )
  if (redirect) {
    return new Response(null, {
      status: 302,
      headers: { Location: redirect },
    })
  }
})
