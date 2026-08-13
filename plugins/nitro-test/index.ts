import type { Server } from 'srvx'
import type { Plugin } from 'vite'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { serve } from 'srvx/node'
import { ENV_RUNNER_PORT_FILE } from './runtime/node/env-runner-bridge.ts'

interface NitroTestGlobal {
  __nitroInstances__?: Set<{ close: () => Promise<void> }>
  __envRunnerServer__?: Server
}

/** Close every registered Nitro instance and the srvx listener. Safe to call multiple times. */
export async function teardownNitroInstances(): Promise<void> {
  const g = globalThis as unknown as NitroTestGlobal
  const instances = g.__nitroInstances__
  if (instances?.size) {
    const pending = [...instances].map(nitro => nitro.close())
    instances.clear()
    await Promise.allSettled(pending)
  }
  if (g.__envRunnerServer__) {
    await g.__envRunnerServer__.close()
    g.__envRunnerServer__ = undefined
  }
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

      const srv = serve({
        fetch: (req: Request) => dispatchFetch(req),
        hostname: '127.0.0.1',
        port: 0,
      })
      await srv.ready()

      const port = new URL(srv.url!).port
      mkdirSync(dirname(ENV_RUNNER_PORT_FILE), { recursive: true })
      writeFileSync(ENV_RUNNER_PORT_FILE, port, 'utf8')

      const g = globalThis as unknown as NitroTestGlobal
      g.__envRunnerServer__ = srv

      server.httpServer?.once('close', () => {
        void srv.close()
        g.__envRunnerServer__ = undefined
      })
    },
  }]
}
