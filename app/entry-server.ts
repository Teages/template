import ui from '@nuxt/ui/vue-plugin'

import { fetchViteEnv } from 'nitro/vite/runtime'

import { createHead, transformHtmlTemplate } from 'unhead/server'
import { createSSRApp, h, Suspense } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { routes } from 'vue-router/auto-routes'
import { renderToString } from 'vue/server-renderer'
import App from './app.vue'
import clientAssets from './entry-client.ts?assets=client'
// ?assets=client omits css in Vite dev; collect main.css from the SSR graph.
import serverAssets from './entry-server.ts?assets=ssr'

import { APP_CONTEXT_KEY, createAppContext } from './utils/app-context.ts'
import { serializePayloadScript } from './utils/payload.ts'
import './assets/css/main.css'

// Per-route ?assets bundles, keyed by page path for SSR <link> emission.
const pageAssetsMap = import.meta.glob('./pages/**/*.vue', {
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

function createSsrFetch(request: Request): typeof globalThis.fetch {
  const origin = new URL(request.url).origin
  const cookie = request.headers.get('cookie')

  return (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const headers = new Headers(
      init?.headers
      ?? (input instanceof Request ? input.headers : undefined),
    )
    if (cookie && !headers.has('cookie'))
      headers.set('cookie', cookie)

    let target: RequestInfo | URL = input
    if (typeof input === 'string' && input.startsWith('/')) {
      target = new URL(input, origin)
    }
    else if (input instanceof URL && input.origin === 'null') {
      target = new URL(input.pathname + input.search, origin)
    }
    else if (input instanceof Request) {
      const url = input.url
      if (url.startsWith('/')) {
        target = new Request(new URL(url, origin), input)
      }
    }

    return fetchViteEnv('nitro', target, { ...init, headers })
  }
}

async function handler(request: Request): Promise<Response> {
  globalThis.fetch = createSsrFetch(request)

  const appContext = createAppContext()
  const app = createSSRApp({
    setup() {
      return () => h(Suspense, null, { default: () => h(App) })
    },
  })
  app.provide(APP_CONTEXT_KEY, appContext)

  const router = createRouter({ history: createMemoryHistory(), routes })
  app.use(router)
  app.use(ui)

  const url = new URL(request.url)
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
        return importer() as Promise<unknown>
      })
      .filter((p): p is Promise<unknown> => p !== null),
  )

  // import:'default' already unwraps; resolved value IS the asset collection.
  const assets = clientAssets.merge(
    serverAssets,
    ...(matchedAssets.filter((a): a is NonNullable<typeof a> => a != null) as any[]),
  )

  const head = createHead()

  head.push({
    link: [
      ...assets.css.map((attrs: any) => ({ rel: 'stylesheet', ...attrs })),
      ...assets.js.map((attrs: any) => ({ rel: 'modulepreload', ...attrs })),
    ],
    script: [{ type: 'module', src: clientAssets.entry }],
  })

  const renderedApp = await renderToString(app)
  const payloadScript = serializePayloadScript(appContext.payload)

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
  <title>Count App</title>
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
