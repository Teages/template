/// <reference types="@nuxt/nitro-server" />

import type { RequestListener } from 'node:http'
import { createServer } from 'node:http'
import { exit } from 'node:process'
import { fileURLToPath } from 'node:url'
import { buildNuxt, loadNuxt } from 'nuxt/kit'

const rootDir = fileURLToPath(new URL('..', import.meta.url))

/**
 * Regenerates `shared/schema.graphql` and `shared/gazania.ts` by booting the
 * app in dev mode and requesting `/graphql` once, which loads the GraphQL
 * schema module (`server/graphql/schema.ts`) whose dev-mode side effect
 * prints the schema.
 */
async function main() {
  const nuxt = await loadNuxt({
    cwd: rootDir,
    dev: true,
    ready: false,
    overrides: {
      // keep the output clean; boot failures surface as thrown errors
      logLevel: 'silent',
      devtools: false,
      vite: {
        server: { hmr: false },
        define: { 'import.meta.env.UPDATE_SCHEMA': true },
      },
    },
  })

  // Minimal `nuxt dev` equivalent
  let handler: RequestListener | undefined
  const httpServer = createServer((req, res) => {
    if (handler) {
      handler(req, res)
    }
    else {
      res.writeHead(503).end()
    }
  })
  await new Promise<void>(resolve => httpServer.listen(0, '127.0.0.1', resolve))
  const { port } = httpServer.address() as { port: number }

  let error: Error | undefined
  try {
    await nuxt.ready()
    await nuxt.hooks.callHook('listen', httpServer, { url: `http://127.0.0.1:${port}/`, server: httpServer })
    await buildNuxt(nuxt)

    handler = (nuxt.server as { handler: RequestListener } | undefined)?.handler
    if (!handler) {
      throw new Error('Nuxt dev build finished without a server handler')
    }

    const res = await fetch(`http://127.0.0.1:${port}/graphql`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: '{ __typename }' }),
      signal: AbortSignal.timeout(10_000),
    })
    if (res.status !== 200) {
      throw new Error(`GraphQL request failed with status ${res.status}`)
    }
  }
  catch (err) {
    error = err as Error
  }
  finally {
    await nuxt.close()
    httpServer.closeAllConnections()
    await new Promise<void>((resolve, reject) => {
      httpServer.close(error => (error ? reject(error) : resolve()))
    })
  }

  if (error) {
    throw new Error(`Failed to update GraphQL schema`, { cause: error })
  }
}

main()
  .then(() => {
    exit(0)
  })
  .catch((err) => {
    console.error(err)
    exit(1)
  })
