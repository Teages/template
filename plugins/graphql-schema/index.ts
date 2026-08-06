import type { Plugin } from 'vite'
import { dirname, relative, resolve } from 'node:path'
import { env } from 'node:process'
import { createConsola } from 'consola'
import { runnerImport } from 'vite'

const logger = createConsola({}).withTag('graphql')
const PLUGIN_DIR = 'plugins/graphql-schema'
const CODEGEN_ENTRY = `${PLUGIN_DIR}/codegen.ts`

export interface GraphqlSchemaPluginOptions {
  /** Module path to the GraphQL schema entry (relative to Vite root). */
  readonly schema: string
  /** Named export that holds the GraphQLSchema instance. */
  readonly schemaExport: string
  readonly outputs: {
    /** SDL output path (relative to Vite root). */
    readonly graphql: string
    /** Gazania types output path (relative to Vite root). */
    readonly gazania: string
  }
}

function shouldSkip(): boolean {
  return Boolean(env.VITEST) || env.NODE_ENV === 'test'
}

function toPosix(path: string): string {
  return path.split(/[/\\]/).join('/')
}

function isWatchedSource(root: string, schema: string, file: string): boolean {
  const rel = toPosix(relative(root, file))
  const schemaRel = toPosix(schema)
  const schemaDir = toPosix(dirname(schemaRel))
  return rel === schemaRel
    || rel.startsWith(`${schemaDir}/`)
    || rel === CODEGEN_ENTRY
    || rel.startsWith(`${PLUGIN_DIR}/`)
}

async function printGraphqlSchema(
  root: string,
  options: GraphqlSchemaPluginOptions,
  printOptions?: { readonly quietIfUnchanged?: boolean },
): Promise<void> {
  const config = {
    schema: resolve(root, options.schema),
    schemaExport: options.schemaExport,
    outputs: {
      graphql: resolve(root, options.outputs.graphql),
      gazania: resolve(root, options.outputs.gazania),
    },
  }

  const { module } = await runnerImport<{
    artifactsUpdated: boolean
  }>(resolve(root, CODEGEN_ENTRY), {
    configFile: false,
    logLevel: 'error',
    root,
    resolve: {
      alias: {
        '~': root,
      },
    },
    define: {
      'import.meta.vitest': 'undefined',
      'import.meta.MOCK_DATABASE': env.MOCK_DATABASE || 'undefined',
      '__GRAPHQL_CODEGEN_CONFIG__': JSON.stringify(config),
    },
  })

  if (module.artifactsUpdated) {
    logger.info('Schema updated.')
  }
  else if (!printOptions?.quietIfUnchanged) {
    logger.info('Schema is up to date.')
  }
}

export function graphqlSchemaPlugin(options: GraphqlSchemaPluginOptions): Plugin {
  let root = ''
  let printChain: Promise<void> = Promise.resolve()
  let printedOnStart = false

  const enqueuePrint = (printOptions?: { readonly quietIfUnchanged?: boolean }) => {
    printChain = printChain
      .then(() => printGraphqlSchema(root, options, printOptions))
      .catch((error: unknown) => {
        // no-excuse-ok: catch — Vite plugin boundary; log and keep server alive
        logger.error('Failed to print schema:', error)
      })
    return printChain
  }

  return {
    name: 'graphql-schema',
    apply: 'serve',
    configResolved(config) {
      root = config.root
    },
    // Awaited during createServer — same pattern as auto-import dts generation.
    async buildStart() {
      if (shouldSkip() || printedOnStart)
        return
      printedOnStart = true
      await enqueuePrint()
    },
    configureServer(server) {
      if (shouldSkip())
        return

      let debounce: ReturnType<typeof setTimeout> | undefined
      const schedule = (file: string) => {
        if (!isWatchedSource(root, options.schema, file))
          return
        clearTimeout(debounce)
        debounce = setTimeout(() => {
          void enqueuePrint({ quietIfUnchanged: true })
        }, 100)
      }

      server.watcher?.on('change', schedule)
      server.watcher?.on('add', schedule)
      server.watcher?.on('unlink', schedule)
    },
  }
}
