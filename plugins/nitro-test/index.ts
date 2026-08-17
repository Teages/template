import type { Server } from 'srvx'
import type { Plugin } from 'vite'
import { serve } from 'srvx/node'

/** Virtual module served by `nitroTestPlugin` (see `env-runner-bridge.ts`). */
export const ENV_RUNNER_ORIGIN_MODULE = 'virtual:nitro-test/env-runner-origin'

const RESOLVED_ORIGIN_MODULE = `\0${ENV_RUNNER_ORIGIN_MODULE}`

interface NitroTestGlobal {
  __nitroInstances__?: Set<{ close: () => Promise<void> }>
  __envRunnerServer__?: Server
  __envRunnerOrigin__?: string
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
    g.__envRunnerOrigin__ = undefined
  }
}

/**
 * Origin of the srvx proxy bound in front of `environments.nitro.dispatchFetch`
 * (env-runner). `load` runs in the same Vite host process as
 * `configureServer`, so the origin is shared through the global instead of a
 * port file; the ModuleRunner gets it baked into the virtual module.
 */
function readEnvRunnerOrigin(): string {
  const origin = (globalThis as unknown as NitroTestGlobal).__envRunnerOrigin__
  if (!origin) {
    throw new Error(
      `${ENV_RUNNER_ORIGIN_MODULE} was requested before configureServer bound the env-runner proxy`,
    )
  }
  return origin
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
    resolveId(id) {
      if (id === ENV_RUNNER_ORIGIN_MODULE) {
        return RESOLVED_ORIGIN_MODULE
      }
    },
    load(id) {
      if (id !== RESOLVED_ORIGIN_MODULE) {
        return
      }
      return `export const envRunnerOrigin = ${JSON.stringify(readEnvRunnerOrigin())}\n`
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

      const g = globalThis as unknown as NitroTestGlobal
      g.__envRunnerOrigin__ = new URL(srv.url!).origin
      g.__envRunnerServer__ = srv

      server.httpServer?.once('close', () => {
        void srv.close()
        g.__envRunnerServer__ = undefined
        g.__envRunnerOrigin__ = undefined
      })
    },
  }]
}
