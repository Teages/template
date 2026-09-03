import { spawn } from 'node:child_process'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'
import { E2E_BASE_URL, E2E_BROWSER_WS } from './constants'

const rootDir = fileURLToPath(new URL('../..', import.meta.url))
const readyTimeout = 120_000

/**
 * Boots the shared e2e infrastructure once per run:
 * - the app dev server (in-memory PGlite, same as `pnpm dev`) on E2E_BASE_URL,
 *   reusing an already-running instance when present;
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
    if (devServer.pid) {
      try {
        process.kill(-devServer.pid, 'SIGTERM')
      }
      catch {
        // already gone
      }
    }
  }
}

/** Spawns `nuxt dev` detached (own process group) unless the URL already responds. */
async function startDevServer() {
  if (await isReady()) {
    return { pid: undefined as number | undefined }
  }

  const child = spawn('pnpm', ['dev', '--port', new URL(E2E_BASE_URL).port], {
    cwd: rootDir,
    detached: true,
    stdio: 'ignore',
  })
  child.unref()

  const deadline = Date.now() + readyTimeout
  while (Date.now() < deadline) {
    if (await isReady()) {
      return { pid: child.pid }
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
