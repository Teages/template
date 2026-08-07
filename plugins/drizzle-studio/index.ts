import type {} from '@vitejs/devtools-kit'
import type { IncomingMessage, Server, ServerResponse } from 'node:http'
import type { Plugin, ViteDevServer } from 'vite'
import { Buffer } from 'node:buffer'
import { randomUUID } from 'node:crypto'
import { createServer } from 'node:http'
import { env } from 'node:process'
import { createConsola } from 'consola'
import { getPort } from 'get-port-please'

const VIRTUAL_ID = 'virtual:drizzle-studio-dock'
const NITRO_STUDIO_PATH = '/api/drizzle-studio'
const STUDIO_AUTHORIZATION_HEADER = 'authorization'
const STUDIO_AUTH_KEY_REPLACEMENT = 'import.meta.DRIZZLE_STUDIO_KEY'
const logger = createConsola({}).withTag('drizzle-studio')

function isEnabled(): boolean {
  return Boolean(env.MOCK_DATABASE) && !env.VITEST
}

function dockClientSource(studioUrl: string): string {
  return `
export default function setup(ctx) {
  ctx.current.events.on('dom:panel:mounted', (el) => {
    el.style.cssText = 'position:relative;width:100%;height:100%;'
    const iframe = document.createElement('iframe')
    // Chrome/Edge Local Network Access: public origins in iframes need an
    // explicit Permissions-Policy delegation before talking to loopback.
    iframe.setAttribute('allow', 'local-network-access')
    iframe.setAttribute('title', 'Drizzle Studio')
    iframe.src = ${JSON.stringify(studioUrl)}
    iframe.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:0;'
    el.appendChild(iframe)
  })
}
`
}

function toBuffer(chunk: unknown): Buffer {
  if (typeof chunk === 'string')
    return Buffer.from(chunk)
  if (Buffer.isBuffer(chunk))
    return chunk
  if (chunk instanceof Uint8Array)
    return Buffer.from(chunk)
  throw new TypeError('Expected an HTTP request chunk')
}

async function nodeToWebRequest(
  nodeReq: IncomingMessage,
  targetUrl: string,
  studioAuthKey: string,
): Promise<Request> {
  const headers = new Headers()
  for (const [key, value] of Object.entries(nodeReq.headers)) {
    if (
      value == null
      || key === 'host'
      || key === 'connection'
      || key.toLowerCase() === STUDIO_AUTHORIZATION_HEADER
    ) {
      continue
    }
    if (Array.isArray(value)) {
      for (const item of value)
        headers.append(key, item)
    }
    else {
      headers.set(key, value)
    }
  }
  headers.set(STUDIO_AUTHORIZATION_HEADER, `Bearer ${studioAuthKey}`)

  const method = nodeReq.method || 'GET'
  if (method === 'GET' || method === 'HEAD') {
    return new Request(targetUrl, { method, headers })
  }

  const chunks: Buffer[] = []
  for await (const chunk of nodeReq as unknown as AsyncIterable<unknown>)
    chunks.push(toBuffer(chunk))

  return new Request(targetUrl, {
    method,
    headers,
    body: Buffer.concat(chunks),
  })
}

async function writeWebResponse(
  nodeRes: ServerResponse,
  response: Response,
): Promise<void> {
  nodeRes.statusCode = response.status
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() === 'transfer-encoding')
      return
    nodeRes.setHeader(key, value)
  })
  nodeRes.end(Buffer.from(await response.arrayBuffer()))
}

function closeHttpServer(server: Server | undefined): Promise<void> {
  if (!server?.listening)
    return Promise.resolve()
  return new Promise((resolve) => {
    server.close(() => resolve())
  })
}

async function startStudioProxy(
  server: ViteDevServer,
  port: number,
  studioAuthKey: string,
): Promise<Server> {
  const nitroEnv = server.environments.nitro as {
    dispatchFetch?: (req: Request) => Promise<Response>
  }
  if (!nitroEnv.dispatchFetch) {
    throw new Error('nitro environment is missing dispatchFetch')
  }
  const dispatchFetch = nitroEnv.dispatchFetch.bind(nitroEnv)

  const httpServer = createServer((nodeReq, nodeRes) => {
    void (async () => {
      try {
        const req = await nodeToWebRequest(
          nodeReq,
          `http://drizzle-studio.local${NITRO_STUDIO_PATH}`,
          studioAuthKey,
        )
        const res = await dispatchFetch(req)
        if (!nodeRes.headersSent && !nodeRes.writableEnded)
          await writeWebResponse(nodeRes, res)
      }
      catch (error) {
        if (!nodeRes.headersSent) {
          nodeRes.statusCode = 500
          nodeRes.end(error instanceof Error ? error.stack : String(error))
        }
      }
    })()
  })

  await new Promise<void>((resolve, reject) => {
    httpServer.once('error', reject)
    httpServer.listen(port, '127.0.0.1', () => resolve())
  })

  logger.info(`Proxy listening on http://127.0.0.1:${port} → ${NITRO_STUDIO_PATH}`)
  return httpServer
}

declare global {
  // Survives Vite plugin-module reloads so we can close the previous proxy.
  // eslint-disable-next-line vars-on-top
  var __DRIZZLE_STUDIO_PROXY__: Server | undefined
}

export default function DrizzleStudio(): Plugin {
  const enabled = isEnabled()
  let studioAuthKey: string | undefined
  let portPromise: Promise<number> | undefined

  function resolvePort(): Promise<number> {
    portPromise ??= getPort({
      port: 4983,
      portRange: [4983, 5083],
    })
    return portPromise
  }

  return {
    name: 'drizzle-studio',
    apply: 'serve',
    nitro: {
      setup(nitro) {
        if (!enabled)
          return
        studioAuthKey = randomUUID()
        nitro.options.replace[STUDIO_AUTH_KEY_REPLACEMENT] = JSON.stringify(studioAuthKey)
      },
    },
    resolveId(id) {
      if (!enabled) {
        return
      }
      if (id === VIRTUAL_ID || id.startsWith(`${VIRTUAL_ID}?`)) {
        return `\0${id}`
      }
    },
    load(id) {
      if (!enabled || !id.startsWith(`\0${VIRTUAL_ID}`)) {
        return
      }
      const query = id.includes('?') ? id.slice(id.indexOf('?') + 1) : ''
      const studioUrl = new URLSearchParams(query).get('url') ?? ''
      return dockClientSource(studioUrl)
    },
    configureServer(server) {
      if (!enabled || !studioAuthKey) {
        return
      }
      const authKey = studioAuthKey

      // Post-hook: Nitro's configureServer has already attached dispatchFetch.
      return () => {
        void (async () => {
          await closeHttpServer(globalThis.__DRIZZLE_STUDIO_PROXY__)
          globalThis.__DRIZZLE_STUDIO_PROXY__ = undefined

          const port = await resolvePort()
          const proxyServer = await startStudioProxy(server, port, authKey)
          globalThis.__DRIZZLE_STUDIO_PROXY__ = proxyServer
          server.httpServer?.once('close', () => {
            void closeHttpServer(proxyServer).then(() => {
              if (globalThis.__DRIZZLE_STUDIO_PROXY__ === proxyServer)
                globalThis.__DRIZZLE_STUDIO_PROXY__ = undefined
            })
          })
        })().catch((error) => {
          logger.error('Failed to start Drizzle Studio proxy', error)
        })
      }
    },
    devtools: {
      async setup(ctx) {
        if (!enabled) {
          return
        }

        const port = await resolvePort()
        const url = `https://local.drizzle.studio?port=${port}`

        ctx.docks.register({
          id: 'drizzle-studio',
          title: 'Drizzle Studio',
          icon: 'simple-icons:drizzle',
          type: 'custom-render',
          renderer: {
            importFrom: `${VIRTUAL_ID}?${new URLSearchParams({ url }).toString()}`,
          },
        })
      },
    },
  }
}
