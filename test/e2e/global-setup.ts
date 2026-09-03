/// <reference types="@nuxt/nitro-server" />

import { createServer } from 'node:http'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'
import { buildNuxt, loadNuxt } from 'nuxt/kit'
import { E2E_BASE_URL, E2E_BROWSER_WS } from './constants'

const rootDir = fileURLToPath(new URL('../..', import.meta.url))
const port = Number(new URL(E2E_BASE_URL).port)
const hostname = new URL(E2E_BASE_URL).hostname
const readyTimeout = 120_000

/** `nuxt.server` in dev: untyped on the schema, so narrowed here. */
interface NuxtDevServer {
  handler?: (req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse) => unknown
}

/**
 * Boots the shared e2e infrastructure once per run:
 * - the app in-process via `loadNuxt` — same dev pipeline as `pnpm dev`
 *   (modules, in-memory PGlite devMock) served on E2E_BASE_URL, reusing an
 *   already-running server when present;
 * - a shared chromium `launchServer` on E2E_BROWSER_WS so every worker
 *   connects to one browser instead of launching its own.
 */
export default async function () {
  const devServer = await startDevServer()

  const browserServer = await chromium.launchServer({
    headless: true,
    port: Number(new URL(E2E_BROWSER_WS).port),
    wsPath: new URL(E2E_BROWSER_WS).pathname.slice(1),
  })

  return async () => {
    await browserServer.close()
    await devServer.close()
  }
}

/**
 * Minimal `nuxt dev` equivalent (mirrors @nuxt/cli's NuxtDevServer without
 * its restart/config-watching machinery): load with `ready: false`, bind the
 * HTTP listener, call `ready()`, fire the `listen` hook so builders can
 * attach to our server, then `buildNuxt()` and serve `nuxt.server.handler`.
 */
async function startDevServer(): Promise<{ close: () => Promise<void> }> {
  if (await isReady()) {
    // someone else is already serving (e.g. a running `pnpm dev`) — use it
    return { close: async () => {} }
  }

  const nuxt = await loadNuxt({
    cwd: rootDir,
    dev: true,
    ready: false,
    overrides: {
      // keep the vitest output clean; boot failures surface as thrown errors
      logLevel: 'silent',

      nitro: {
        handlers: [{
          route: '/_test/db',
          handler: fileURLToPath(new URL('./utils/db/handler.ts', import.meta.url)),
        }],
      },
    },
  })

  let handler: NuxtDevServer['handler']
  const httpServer = createServer((req, res) => {
    if (handler) {
      handler(req, res)
    }
    else {
      res.writeHead(503).end()
    }
  })
  httpServer.on('upgrade', (req, socket) => socket.end())
  await new Promise<void>(resolve => httpServer.listen(port, hostname, resolve))

  await nuxt.ready()
  await nuxt.hooks.callHook('listen', httpServer, { url: `${E2E_BASE_URL}/`, server: httpServer })
  await buildNuxt(nuxt)

  handler = (nuxt.server as NuxtDevServer | undefined)?.handler
  if (!handler) {
    await nuxt.close()
    throw new Error('Nuxt dev build finished without a server handler')
  }

  await waitForReady()

  return {
    close: async () => {
      await nuxt.close()
      httpServer.closeAllConnections()
      await new Promise<void>((resolve, reject) => {
        httpServer.close(error => (error ? reject(error) : resolve()))
      })
    },
  }
}

async function waitForReady() {
  const deadline = Date.now() + readyTimeout
  while (Date.now() < deadline) {
    if (await isReady()) {
      return
    }
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  throw new Error(`Dev server did not become ready at ${E2E_BASE_URL} within ${readyTimeout}ms`)
}

async function isReady() {
  try {
    const response = await fetch(new URL('/hello', E2E_BASE_URL), { signal: AbortSignal.timeout(2_000) })
    return response.ok
  }
  catch {
    return false
  }
}
