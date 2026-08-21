import type {} from '@vitejs/devtools-kit'
import type { Nitro } from 'nitro/types'
import type { Plugin, ServerOptions } from 'vite'
import { randomUUID } from 'node:crypto'
import { env } from 'node:process'
import { createConsola } from 'consola'
import { getPort } from 'get-port-please'
import { resolve } from 'pathe'
import { replaceStudioProxy } from './proxy.ts'

const VIRTUAL_ID = 'virtual:drizzle-studio-dock'
const NITRO_STUDIO_PATH = '/api/drizzle-studio'
const NITRO_STUDIO_HANDLER = resolve(
  import.meta.dirname,
  'runtime/server/handler.ts',
)
const STUDIO_AUTH_KEY_REPLACEMENT = 'import.meta.DRIZZLE_STUDIO_KEY'
const logger = createConsola({}).withTag('drizzle-studio')

interface StudioEnvironment {
  readonly VITEST?: string
}

type StudioNitroOptions = Pick<Nitro['options'], 'replace' | 'routes'>

export function isDrizzleStudioEnabled(
  environment: StudioEnvironment,
): boolean {
  return !environment.VITEST
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

export function shouldStartStudioProxy(
  enabled: boolean,
  middlewareMode: ServerOptions['middlewareMode'],
): boolean {
  return enabled && !middlewareMode
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
      if (!shouldStartStudioProxy(enabled, server.config.server.middlewareMode) || !studioAuthKey) {
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
    devtools: {
      async setup(ctx) {
        if (!enabled) {
          return
        }

        const port = await resolvePort()
        const url = drizzleStudioUrl(port)

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
