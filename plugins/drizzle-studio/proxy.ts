import type { IncomingMessage, Server, ServerResponse } from 'node:http'
import type { ViteDevServer } from 'vite'
import { Buffer } from 'node:buffer'
import { createServer } from 'node:http'
import { createConsola } from 'consola'

const STUDIO_AUTHORIZATION_HEADER = 'authorization'
const logger = createConsola({}).withTag('drizzle-studio')

interface DrizzleStudioGlobal {
  __DRIZZLE_STUDIO_PROXY__?: Server
}

// Survives Vite plugin-module reloads so a new instance can close the old proxy.
const drizzleStudioGlobal = globalThis as unknown as DrizzleStudioGlobal

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
  nitroStudioPath: string,
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
          `http://drizzle-studio.local${nitroStudioPath}`,
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

  logger.info(`Proxy listening on http://127.0.0.1:${port} → ${nitroStudioPath}`)
  return httpServer
}

export async function replaceStudioProxy(
  server: ViteDevServer,
  port: number,
  studioAuthKey: string,
  nitroStudioPath: string,
): Promise<void> {
  await closeHttpServer(drizzleStudioGlobal.__DRIZZLE_STUDIO_PROXY__)
  drizzleStudioGlobal.__DRIZZLE_STUDIO_PROXY__ = undefined

  const proxyServer = await startStudioProxy(
    server,
    port,
    studioAuthKey,
    nitroStudioPath,
  )
  drizzleStudioGlobal.__DRIZZLE_STUDIO_PROXY__ = proxyServer
  server.httpServer?.once('close', () => {
    void closeHttpServer(proxyServer).then(() => {
      if (drizzleStudioGlobal.__DRIZZLE_STUDIO_PROXY__ === proxyServer)
        drizzleStudioGlobal.__DRIZZLE_STUDIO_PROXY__ = undefined
    })
  })
}
