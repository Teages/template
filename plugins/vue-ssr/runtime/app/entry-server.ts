import { serverFetch } from 'nitro/app'
import { createHead, transformHtmlTemplate } from 'unhead/server'
import { createMemoryHistory } from 'vue-router'
import { renderToString } from 'vue/server-renderer'
import { createAppContext } from './app-context.ts'
import { createVueApp } from './create-vue-app.ts'
import { createAppPayload } from './data-layer.ts'
import clientAssets from './entry-client?assets=client'
// ?assets=client omits css in Vite dev; collect main.css from the SSR graph.
import serverAssets from './entry-server?assets=ssr'
import { serverVuePlugins } from './load-plugins.server.ts'
import { serializePayloadScript } from './payload.ts'
import { createSsrFetchContext } from './ssr-fetch.ts'
import { initializeVueApp } from './vue-plugin.ts'

// Per-route ?assets bundles, keyed by page path for SSR <link> emission.
const pageAssetsMap = import.meta.glob<typeof clientAssets>('/app/pages/**/*.vue', {
  query: '?assets',
  import: 'default',
})

/** Normalize an absolute page path to the /app/pages/... glob key. */
export function toPageAssetKey(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/')
  const marker = '/app/pages/'
  const index = normalized.lastIndexOf(marker)
  return index === -1 ? normalized : normalized.slice(index)
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
  const appContext = createAppContext(fetchContext)
  const head = createHead()
  const { app, pinia, queryCache, router } = createVueApp({
    appContext,
    environment: 'server',
    history: createMemoryHistory(),
  })

  try {
    const pluginResponse = await initializeVueApp({
      environment: 'server',
      app,
      appContext,
      head,
      queryCache,
      request,
      router,
    }, serverVuePlugins)
    if (pluginResponse)
      return pluginResponse

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
          const key = toPageAssetKey(filePath)
          const importer = pageAssetsMap[key]
          if (!importer) {
            console.warn(`[entry-server] no assets importer for ${key} (have: ${Object.keys(pageAssetsMap).join(', ')})`)
            return null
          }
          return importer()
        })
        .filter((asset): asset is Promise<typeof clientAssets> => asset !== null),
    )

    const assets = clientAssets.merge(
      serverAssets,
      ...matchedAssets,
    )

    head.push({
      link: [
        ...assets.css.map(attrs => ({ rel: 'stylesheet', ...attrs })),
        ...assets.js.map(attrs => ({ rel: 'modulepreload', ...attrs })),
      ],
      script: [{ type: 'module', src: clientAssets.entry }],
    })

    const renderedApp = await renderToString(app)
    const payloadScript = serializePayloadScript(
      createAppPayload(pinia, queryCache),
    )
    const html = await transformHtmlTemplate(
      head,
      htmlTemplate(renderedApp, payloadScript),
    )

    return new Response(html, {
      headers: { 'Content-Type': 'text/html;charset=utf-8' },
    })
  }
  finally {
    queryCache.caches.clear()
  }
}

function htmlTemplate(body: string, payloadScript: string): string {
  return /* html */ `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
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
