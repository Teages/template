import type { Server } from 'srvx'
import type { ViteDevServer } from 'vite'
import { serve } from 'srvx/node'

const STUDIO_AUTHORIZATION_HEADER = 'authorization'

interface DrizzleStudioGlobal {
  __DRIZZLE_STUDIO_PROXY__?: Server
}

// Survives Vite plugin-module reloads so a new instance can close the old proxy.
const drizzleStudioGlobal = globalThis as unknown as DrizzleStudioGlobal

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

  const proxyServer = serve({
    fetch(request) {
      const forwardedRequest = new Request(
        `http://drizzle-studio.local${nitroStudioPath}`,
        request,
      )
      forwardedRequest.headers.delete('host')
      forwardedRequest.headers.delete('connection')
      forwardedRequest.headers.set(
        STUDIO_AUTHORIZATION_HEADER,
        `Bearer ${studioAuthKey}`,
      )
      return dispatchFetch(forwardedRequest)
    },
    gracefulShutdown: false,
    hostname: '127.0.0.1',
    port,
    silent: true,
  })
  await proxyServer.ready()
  return proxyServer
}

export async function replaceStudioProxy(
  server: ViteDevServer,
  port: number,
  studioAuthKey: string,
  nitroStudioPath: string,
): Promise<void> {
  await drizzleStudioGlobal.__DRIZZLE_STUDIO_PROXY__?.close()
  drizzleStudioGlobal.__DRIZZLE_STUDIO_PROXY__ = undefined

  const proxyServer = await startStudioProxy(
    server,
    port,
    studioAuthKey,
    nitroStudioPath,
  )
  drizzleStudioGlobal.__DRIZZLE_STUDIO_PROXY__ = proxyServer
  server.httpServer?.once('close', () => {
    void proxyServer.close().then(() => {
      if (drizzleStudioGlobal.__DRIZZLE_STUDIO_PROXY__ === proxyServer)
        drizzleStudioGlobal.__DRIZZLE_STUDIO_PROXY__ = undefined
    })
  })
}
