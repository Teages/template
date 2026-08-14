import type {
  ClientVuePluginContext,
  ServerVuePluginContext,
} from '~/plugins/vue-ssr/runtime/app/vue-plugin'
import { readFileSync } from 'node:fs'
import { createHead } from '@unhead/vue/server'
import { describe, expect, it } from 'vitest'
import { createSSRApp } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import {
  APP_CONTEXT_KEY,
  createAppContext,
} from '~/plugins/vue-ssr/runtime/app/app-context'
import { installDataLayer } from '~/plugins/vue-ssr/runtime/app/data-layer'
import {
  applyVuePlugins,
  collectVuePlugins,
  defineVuePlugin,
  initializeVueApp,
} from '~/plugins/vue-ssr/runtime/app/vue-plugin'

function createClientContext(): ClientVuePluginContext {
  const app = createSSRApp({})
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [],
  })
  const appContext = createAppContext()
  app.provide(APP_CONTEXT_KEY, appContext)
  const { queryCache } = installDataLayer(app)

  return {
    environment: 'client',
    app,
    appContext,
    queryCache,
    router,
  }
}

function createServerContext(): ServerVuePluginContext {
  const client = createClientContext()
  return {
    ...client,
    environment: 'server',
    head: createHead(),
    request: new Request('http://localhost/private'),
  }
}

describe('vue runtime plugins', () => {
  it('keeps client-only and server-only modules in their target bundles', () => {
    // Given
    const clientLoader = readFileSync(
      new URL(
        '../../../../plugins/vue-ssr/runtime/app/load-plugins.client.ts',
        import.meta.url,
      ),
      'utf8',
    )
    const serverLoader = readFileSync(
      new URL(
        '../../../../plugins/vue-ssr/runtime/app/load-plugins.server.ts',
        import.meta.url,
      ),
      'utf8',
    )

    // When / Then
    expect(clientLoader).toContain('!/app/plugins/*.server.ts')
    expect(serverLoader).toContain('!/app/plugins/*.client.ts')
    expect(clientLoader).toContain('eager: true')
    expect(serverLoader).toContain('eager: true')
  })

  it('preserves the setup function passed to defineVuePlugin', () => {
    // Given
    const setup = defineVuePlugin(() => {})

    // When / Then
    expect(defineVuePlugin(setup)).toBe(setup)
  })

  it('applies plugins sequentially in path order', async () => {
    // Given
    const calls: string[] = []
    const plugins = collectVuePlugins({
      '/app/plugins/02.second.ts': async () => {
        await Promise.resolve()
        calls.push('second')
      },
      '/app/plugins/01.first.ts': () => {
        calls.push('first')
      },
    })

    // When
    await applyVuePlugins(createClientContext(), plugins)

    // Then
    expect(calls).toEqual(['first', 'second'])
  })

  it('installs the router only after every app plugin finishes', async () => {
    // Given
    const context = createClientContext()
    const routerDuringSetup: unknown[] = []
    const plugins = [
      defineVuePlugin(async () => {
        routerDuringSetup.push(context.app.config.globalProperties.$router)
        await Promise.resolve()
        routerDuringSetup.push(context.app.config.globalProperties.$router)
      }),
    ]

    // When
    await initializeVueApp(context, plugins)

    // Then
    expect(routerDuringSetup).toEqual([undefined, undefined])
    expect(context.app.config.globalProperties.$router).toBe(context.router)
  })

  it('stops server setup at the first Response', async () => {
    // Given
    const calls: string[] = []
    const response = new Response(null, {
      status: 302,
      headers: { Location: '/sign-in' },
    })
    const plugins = [
      defineVuePlugin(() => {
        calls.push('redirect')
        return response
      }),
      defineVuePlugin(() => {
        calls.push('after')
      }),
    ]

    // When
    const context = createServerContext()
    const result = await initializeVueApp(context, plugins)

    // Then
    expect(result).toBe(response)
    expect(calls).toEqual(['redirect'])
    expect(context.app.config.globalProperties.$router).toBeUndefined()
  })

  it('rejects a Response returned during client setup', async () => {
    // Given
    const plugins = [
      defineVuePlugin(() => new Response()),
    ]

    // When
    const result = applyVuePlugins(createClientContext(), plugins)

    // Then
    await expect(result).rejects.toThrow(
      'Vue client plugins cannot return a Response',
    )
  })

  it('propagates setup errors without running later plugins', async () => {
    // Given
    const calls: string[] = []
    const failure = new TypeError('plugin failed')
    const plugins = [
      defineVuePlugin(() => {
        throw failure
      }),
      defineVuePlugin(() => {
        calls.push('after')
      }),
    ]

    // When
    const result = applyVuePlugins(createClientContext(), plugins)

    // Then
    await expect(result).rejects.toBe(failure)
    expect(calls).toEqual([])
  })
})
