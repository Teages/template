import type { Nitro } from 'nitro/types'
import type { Plugin } from 'vite'
import { randomUUID } from 'node:crypto'
import { env } from 'node:process'
import { createConsola } from 'consola'
import { getPort } from 'get-port-please'
import { resolve } from 'pathe'
import { replaceStudioProxy } from './proxy.ts'

const NITRO_STUDIO_PATH = '/api/drizzle-studio'
const NITRO_STUDIO_HANDLER = resolve(
  import.meta.dirname,
  'runtime/server/handler.ts',
)
const STUDIO_AUTH_KEY_REPLACEMENT = 'import.meta.DRIZZLE_STUDIO_KEY'
const logger = createConsola({}).withTag('drizzle-studio')

interface StudioEnvironment {
  readonly MOCK_DATABASE?: string
  readonly VITEST?: string
}

type StudioNitroOptions = Pick<Nitro['options'], 'replace' | 'routes'>

export function isDrizzleStudioEnabled(
  environment: StudioEnvironment,
): boolean {
  return Boolean(environment.MOCK_DATABASE) && !environment.VITEST
}

export function configureDrizzleStudioNitro(
  options: StudioNitroOptions,
  studioAuthKey: string,
): void {
  options.replace[STUDIO_AUTH_KEY_REPLACEMENT] = JSON.stringify(studioAuthKey)
  options.routes[NITRO_STUDIO_PATH] = {
    handler: NITRO_STUDIO_HANDLER,
  }
}

/** The Studio web app that pairs with the loopback proxy port. */
export function drizzleStudioUrl(port: number): string {
  return `https://local.drizzle.studio?port=${port}`
}

export default function DrizzleStudio(): Plugin {
  const enabled = isDrizzleStudioEnabled(env)
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
        configureDrizzleStudioNitro(nitro.options, studioAuthKey)
      },
    },
    configureServer(server) {
      if (!enabled || !studioAuthKey) {
        return
      }
      const authKey = studioAuthKey

      // Post-hook: Nitro's configureServer has already attached dispatchFetch.
      return () => {
        void (async () => {
          const port = await resolvePort()
          await replaceStudioProxy(
            server,
            port,
            authKey,
            NITRO_STUDIO_PATH,
          )
          logger.info(`Drizzle Studio: ${drizzleStudioUrl(port)}`)
        })().catch((error) => {
          logger.error('Failed to start Drizzle Studio proxy', error)
        })
      }
    },
  }
}
