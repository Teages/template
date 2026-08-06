import type { IncomingMessage, ServerResponse } from 'node:http'
import type { AddressInfo } from 'node:net'
import type { Plugin } from 'vite'
import { Buffer } from 'node:buffer'
import { mkdirSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { dirname } from 'node:path'
import { ENV_RUNNER_PORT_FILE } from './env-runner-bridge.ts'

/**
 * Nitro instances are tracked on `globalThis` (not a module-level variable)
 * because Vitest loads the workspace config and the `globalSetup` file through
 * separate module graphs — a module-level `Set` ends up as two unrelated
 * instances and the teardown always sees an empty collection. `globalThis` is
 * shared across both graphs within the same process.
 */
interface NitroTestGlobal {
  __nitroInstances__?: Set<{ close: () => Promise<void> }>
  __envRunnerHttpServer__?: ReturnType<typeof createServer>
}

/** Close every registered Nitro instance. Safe to call multiple times. */
export async function teardownNitroInstances(): Promise<void> {
  const g = globalThis as unknown as NitroTestGlobal
  const instances = g.__nitroInstances__
  if (instances?.size) {
    const pending = [...instances].map(nitro => nitro.close())
    instances.clear()
    await Promise.allSettled(pending)
  }
  const httpServer = g.__envRunnerHttpServer__
  if (httpServer) {
    await new Promise<void>(resolve => httpServer.close(() => resolve()))
    g.__envRunnerHttpServer__ = undefined
  }
}

async function nodeToWebRequest(
  nodeReq: IncomingMessage,
  origin: string,
): Promise<Request> {
  const url = new URL(nodeReq.url || '/', origin)
  const headers = new Headers()
  for (const [key, value] of Object.entries(nodeReq.headers)) {
    if (value == null)
      continue
    if (Array.isArray(value)) {
      for (const item of value)
        headers.append(key, item)
    }
    else {
      headers.set(key, value)
    }
  }

  const method = nodeReq.method || 'GET'
  if (method === 'GET' || method === 'HEAD') {
    return new Request(url, { method, headers })
  }

  const chunks: Buffer[] = []
  for await (const chunk of nodeReq)
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)

  return new Request(url, {
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
  const buffer = Buffer.from(await response.arrayBuffer())
  nodeRes.end(buffer)
}

export function nitroTestPlugin(): Plugin[] {
  return [{
    name: 'nitro:test',
    nitro: {
      setup(nitro) {
        const g = globalThis as unknown as NitroTestGlobal
        ;(g.__nitroInstances__ ??= new Set()).add(nitro)
      },
    },
    async configureServer(server) {
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
            const address = httpServer.address() as AddressInfo
            const origin = `http://127.0.0.1:${address.port}`
            const req = await nodeToWebRequest(nodeReq, origin)
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

      const g = globalThis as unknown as NitroTestGlobal
      g.__envRunnerHttpServer__ = httpServer

      server.httpServer?.once('close', () => {
        httpServer.close()
        g.__envRunnerHttpServer__ = undefined
      })

      await new Promise<void>((resolve, reject) => {
        httpServer.once('error', reject)
        httpServer.listen(0, '127.0.0.1', () => {
          try {
            const address = httpServer.address() as AddressInfo
            mkdirSync(dirname(ENV_RUNNER_PORT_FILE), { recursive: true })
            writeFileSync(ENV_RUNNER_PORT_FILE, String(address.port), 'utf8')
            resolve()
          }
          catch (error) {
            reject(error)
          }
        })
      })
    },
  }]
}
