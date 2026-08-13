import ui from '@nuxt/ui/vue-plugin'

import { serverFetch } from 'nitro/app'

import { createHead, transformHtmlTemplate } from 'unhead/server'
import { createSSRApp, h, Suspense } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { routes } from 'vue-router/auto-routes'
import { renderToString } from 'vue/server-renderer'
import { APP_CONTEXT_KEY, createAppContext } from '~/plugins/vue-ssr/runtime/app/app-context'
import { createAppPayload, installDataLayer } from '~/plugins/vue-ssr/runtime/app/data-layer'
import { serializePayloadScript } from '~/plugins/vue-ssr/runtime/app/payload'
import { createSsrFetchContext } from '~/plugins/vue-ssr/runtime/app/ssr-fetch'
import App from './app.vue'
import clientAssets from './entry-client?assets=client'
// ?assets=client omits css in Vite dev; collect main.css from the SSR graph.
import serverAssets from './entry-server?assets=ssr'

import { authRedirectFor } from './utils/auth-routes'
import { fetchAuthSession } from './utils/auth-session'
import { AUTH_SESSION_QUERY_KEY } from './utils/query-keys'
import './assets/css/main.css'

// Per-route ?assets bundles, keyed by page path for SSR <link> emission.
const pageAssetsMap = import.meta.glob<typeof clientAssets>('./pages/**/*.vue', {
  query: '?assets',
  import: 'default',
})

/** Normalize absolute/project-relative paths to the ./pages/... glob key. */
function toGlobKey(filePath: string): string {
  const idx = filePath.replace(/\\/g, '/').lastIndexOf('/pages/')
  if (idx === -1)
    return filePath
  return `.${filePath.slice(idx)}`
}

async function handler(request: Request): Promise<Response> {
  // Use `serverFetch` (in-process `useNitroApp().fetch`) instead of
  // `fetchViteEnv('nitro', ...)`: under the dev env-runner the `nitro`
  // vite-service lookup intermittently resolves to `undefined` and throws
  // `HTTPError 404 <no response>`. `serverFetch` calls the H3 app handler
  // directly, which is all the SSR data fetches need, and stays consistent
  // with production where API and SSR share one Nitro instance.
  const fetchContext = createSsrFetchContext(
    request,
    (input, init) => serverFetch(input, init),
  )
  const url = new URL(request.url)
  const session = await fetchAuthSession(fetchContext.$requestFetch)
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

  const appContext = createAppContext(fetchContext)
  const app = createSSRApp({
    setup() {
      return () => h(Suspense, null, { default: () => h(App) })
    },
  })
  app.provide(APP_CONTEXT_KEY, appContext)

  const { pinia, queryCache } = installDataLayer(app, { ssr: true })
  queryCache.setQueryData(AUTH_SESSION_QUERY_KEY, session)

  const router = createRouter({ history: createMemoryHistory(), routes })
  app.use(router)
  app.use(ui)

  const href = url.href.slice(url.origin.length)

  await router.push(href)
  await router.isReady()

  const matchedAssets = await Promise.all(
    router.currentRoute.value.matched
      .map((to) => {
        const filePath = to.meta.__filePath as string | undefined
        if (!filePath)
          return null
        const key = toGlobKey(filePath)
        const importer = pageAssetsMap[key]
        if (!importer) {
          console.warn(`[entry-server] no assets importer for ${key} (have: ${Object.keys(pageAssetsMap).join(', ')})`)
          return null
        }
        return importer()
      })
      .filter((p): p is Promise<typeof clientAssets> => p !== null),
  )

  // import:'default' already unwraps; resolved value IS the asset collection.
  const assets = clientAssets.merge(
    serverAssets,
    ...matchedAssets,
  )

  const head = createHead()

  head.push({
    link: [
      ...assets.css.map(attrs => ({ rel: 'stylesheet', ...attrs })),
      ...assets.js.map(attrs => ({ rel: 'modulepreload', ...attrs })),
    ],
    script: [{ type: 'module', src: clientAssets.entry }],
  })

  let renderedApp: string
  let payloadScript: string
  try {
    renderedApp = await renderToString(app)
    payloadScript = serializePayloadScript(createAppPayload(pinia, queryCache))
  }
  finally {
    queryCache.caches.clear()
  }

  const html = await transformHtmlTemplate(
    head,
    htmlTemplate(renderedApp, payloadScript),
  )

  return new Response(html, {
    headers: { 'Content-Type': 'text/html;charset=utf-8' },
  })
}

function htmlTemplate(body: string, payloadScript: string): string {
  return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Full-stack API Template</title>
</head>
<body>
  <div id="root" class="isolate">${body}</div>
  ${payloadScript}
</body>
</html>`
}

export default {
  fetch: handler,
}
