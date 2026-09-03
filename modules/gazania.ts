import type { GenerateConfig } from 'gazania/codegen'
import type { GraphQLSchema, IntrospectionQuery } from 'graphql'
import type { Nuxt } from 'nuxt/schema'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, extname } from 'node:path'
import { pathToFileURL } from 'node:url'
import { generate } from 'gazania/codegen'
import { buildClientSchema, getIntrospectionQuery, GraphQLSchema as GraphQLSchemaClass, printSchema } from 'graphql'
import { createResolver, defineNuxtModule, useLogger } from 'nuxt/kit'

interface UrlSource {
  url: string
  headers?: Record<string, string>
  method?: 'GET' | 'POST'
}

interface SdlSource {
  sdl: string
}

interface JsonSource {
  json: string
}

type GetterSource = () => string | GraphQLSchema | Promise<string | GraphQLSchema>

type ModuleSchemaSource = string | GraphQLSchema | UrlSource | SdlSource | JsonSource | GetterSource

interface ModuleOptions {
  schema?: ModuleSchemaSource
  scalars?: GenerateConfig['scalars']
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'gazania',
    configKey: 'gazania',
  },
  defaults: {
  },
  async setup(options, nuxt) {
    const logger = useLogger('gazania')
    const rootResolver = createResolver(nuxt.options.rootDir)

    if (!options.schema) {
      logger.warn('Schema is required in module options. Gazania is disabled.')
      return
    }

    const schema = resolveSchemaSource(options.schema, nuxt)
    const schemaOutputPath = rootResolver.resolve(
      nuxt.options.buildDir,
      'types/gazania-schema.ts',
    )

    nuxt.options.alias['#gazania/schema'] = schemaOutputPath
    nuxt.hook('nitro:config', (config) => {
      config.alias ??= {}
      config.alias['#gazania/schema'] = schemaOutputPath
    })

    nuxt.hook('prepare:types', async () => {
      await runCodegen()
    })

    if (nuxt.options.dev) {
      const schemaPath = getSchemaWatchPath(options.schema)

      if (schemaPath) {
        nuxt.hook('builder:watch', async (_event, path) => {
          const resolved = rootResolver.resolve(nuxt.options.rootDir, path)
          if (resolved === schemaPath) {
            await runCodegen()
          }
        })
      }
    }

    async function runCodegen() {
      try {
        const { sdl, url } = await loadSchema(schema)
        const code = generate({ source: sdl, scalars: options.scalars, url })
        await mkdir(dirname(schemaOutputPath), { recursive: true })
        await writeFile(schemaOutputPath, code, 'utf-8')
      }
      catch (cause) {
        logger.error('Failed to generate schema types', cause)
        throw cause
      }
    }

    function resolveSchemaSource(source: ModuleSchemaSource, nuxt: Nuxt): ModuleSchemaSource {
      if (typeof source !== 'string' || !looksLikeLocalPath(source)) {
        return source
      }

      return rootResolver.resolve(nuxt.options.rootDir, source)
    }

    function getSchemaWatchPath(source: ModuleSchemaSource): string | null {
      if (typeof source !== 'string' || !looksLikeLocalPath(source)) {
        return null
      }

      return rootResolver.resolve(nuxt.options.rootDir, source)
    }

    function looksLikeLocalPath(source: string): boolean {
      if (URL.canParse(source)) {
        return false
      }

      return Boolean(extname(source) || source.includes('/') || source.includes('\\'))
    }

    async function loadSchema(source: ModuleSchemaSource): Promise<{ sdl: string, url?: string }> {
      if (typeof source === 'function') {
        const result = await source()
        if (result instanceof GraphQLSchemaClass) {
          return { sdl: printSchema(result) }
        }
        return { sdl: result }
      }

      if (typeof source === 'string') {
        return await resolveString(source)
      }

      if (source instanceof GraphQLSchemaClass) {
        return { sdl: printSchema(source) }
      }

      if ('url' in source) {
        return {
          sdl: await introspectFromUrl(source.url, source.headers, source.method),
          url: source.url,
        }
      }

      if ('sdl' in source) {
        return { sdl: source.sdl }
      }

      if ('json' in source) {
        return { sdl: jsonToSDL(source.json) }
      }

      throw new Error('Invalid schema source')
    }

    async function resolveString(value: string): Promise<{ sdl: string, url?: string }> {
      if (value.startsWith('http://') || value.startsWith('https://')) {
        return {
          sdl: await introspectFromUrl(value),
          url: value,
        }
      }

      const ext = extname(value).toLowerCase()

      if (ext === '.graphql' || ext === '.gql') {
        return { sdl: await readFile(value, 'utf-8') }
      }

      if (ext === '.json') {
        return { sdl: jsonToSDL(await readFile(value, 'utf-8')) }
      }

      if (ext === '.ts' || ext === '.js' || ext === '.mts' || ext === '.mjs' || ext === '.cts' || ext === '.cjs') {
        return await loadFromModule(value)
      }

      if (ext || value.includes('/') || value.includes('\\')) {
        throw new Error(
          `Unknown schema source: ${value}\n`
          + 'If this is a file, use a supported extension: .graphql, .gql, .json, .ts, .js, .mjs, .cjs, .mts, .cts',
        )
      }

      return { sdl: value }
    }

    function jsonToSDL(raw: string): string {
      try {
        const parsed = JSON.parse(raw) as IntrospectionQuery | { data?: IntrospectionQuery }
        const data = unwrapIntrospectionQuery(parsed)

        return printSchema(buildClientSchema(data))
      }
      catch (cause) {
        throw new Error('Failed to parse introspection JSON', { cause })
      }
    }

    function unwrapIntrospectionQuery(
      payload: IntrospectionQuery | { data?: IntrospectionQuery },
    ): IntrospectionQuery {
      if ('__schema' in payload) {
        return payload
      }

      if (payload.data) {
        return payload.data
      }

      throw new Error('Introspection response missing "data" field')
    }

    async function loadFromModule(filePath: string): Promise<{ sdl: string, url?: string }> {
      const url = pathToFileURL(filePath).href
      const mod = await import(url) as Record<string, unknown>
      const schema = mod.schema ?? mod.default

      if (schema == null) {
        throw new Error(
          `Schema not found in ${filePath}. Export a schema source as "schema" or "default".`,
        )
      }

      return await loadSchema(schema as ModuleSchemaSource)
    }

    async function introspectFromUrl(
      url: string,
      headers?: Record<string, string>,
      method: 'GET' | 'POST' = 'POST',
    ): Promise<string> {
      const query = getIntrospectionQuery()

      let response: Response

      if (method === 'GET') {
        const requestUrl = new URL(url)
        requestUrl.searchParams.set('query', query)
        response = await fetch(requestUrl.href, { headers })
      }
      else {
        response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...headers },
          body: JSON.stringify({ query }),
        })
      }

      if (!response.ok) {
        throw new Error(`Introspection request failed: ${response.status} ${response.statusText}`)
      }

      const { data } = await response.json() as { data?: IntrospectionQuery }

      if (!data) {
        throw new Error('Introspection response missing "data" field')
      }

      return printSchema(buildClientSchema(data))
    }
  },
})
