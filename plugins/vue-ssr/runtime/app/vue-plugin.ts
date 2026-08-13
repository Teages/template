import type { useQueryCache } from '@pinia/colada'
import type { ResolvableHead, Unhead } from 'unhead/types'
import type { App } from 'vue'
import type { Router } from 'vue-router'
import type { AppContext } from './app-context.ts'

interface VuePluginContextBase {
  readonly app: App
  readonly appContext: AppContext
  readonly queryCache: ReturnType<typeof useQueryCache>
  readonly router: Router
}

export interface ClientVuePluginContext extends VuePluginContextBase {
  readonly environment: 'client'
}

export interface ServerVuePluginContext extends VuePluginContextBase {
  readonly environment: 'server'
  readonly head: Unhead<ResolvableHead>
  readonly request: Request
}

export type VuePluginContext
  = | ClientVuePluginContext
    | ServerVuePluginContext

export type VuePlugin = (
  context: VuePluginContext,
) => void | Response | Promise<void | Response>

export function defineVuePlugin<T extends VuePlugin>(plugin: T): T {
  return plugin
}

export function collectVuePlugins(
  modules: Readonly<Record<string, VuePlugin>>,
): readonly VuePlugin[] {
  return Object.entries(modules)
    .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
    .map(([, plugin]) => plugin)
}

export async function applyVuePlugins(
  context: VuePluginContext,
  plugins: readonly VuePlugin[],
): Promise<Response | undefined> {
  for (const plugin of plugins) {
    const result = await plugin(context)
    if (!(result instanceof Response))
      continue

    if (context.environment === 'client') {
      throw new TypeError('Vue client plugins cannot return a Response')
    }
    return result
  }
}

export async function initializeVueApp(
  context: VuePluginContext,
  plugins: readonly VuePlugin[],
): Promise<Response | undefined> {
  const response = await applyVuePlugins(context, plugins)
  if (response)
    return response

  context.app.use(context.router)
}
