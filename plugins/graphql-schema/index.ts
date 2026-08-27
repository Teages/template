import type { Plugin } from 'vite'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, relative, resolve } from 'node:path'
import { env } from 'node:process'
import { createConsola } from 'consola'
import { runnerImport } from 'vite'

const logger = createConsola({}).withTag('graphql')
const CODEGEN_ENTRY = 'plugins/graphql-schema/codegen.ts'
const SCHEMA_ENTRY_ID = 'virtual:graphql-schema-entry'
const DRIZZLE_STUB = resolve(
  import.meta.dirname,
  'stubs/drizzle.ts',
)

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

async function updateFile(path: string, content: string): Promise<boolean> {
  const existing = await readFile(path, 'utf-8').catch(() => null)
  if (existing === content)
    return false
  await writeFile(path, content)
  return true
}

function isWatchedSource(root: string, schema: string, file: string): boolean {
  const rel = toPosix(relative(root, file))
  const schemaRel = toPosix(schema)
  const schemaDir = toPosix(dirname(schemaRel))
  return rel === schemaRel
    || rel.startsWith(`${schemaDir}/`)
    || rel === CODEGEN_ENTRY
}

async function printGraphqlSchema(
  root: string,
  options: GraphqlSchemaPluginOptions,
  printOptions?: { readonly quietIfUnchanged?: boolean },
): Promise<void> {
  const schemaPath = resolve(root, options.schema)
  const { module: artifacts } = await runnerImport<{
    graphql: string
    gazania: string
  }>(resolve(root, CODEGEN_ENTRY), {
    configFile: false,
    logLevel: 'error',
    root,
    resolve: {
      alias: {
        '~': root,
        [SCHEMA_ENTRY_ID]: schemaPath,
        // Bare imports bypass the runner's plugin container and externalize
        // straight to Node, where `#drizzle` cannot resolve — alias the
        // virtual client to the throwing stub instead.
        '#drizzle': DRIZZLE_STUB,
      },
    },
    define: {
      'import.meta.vitest': 'undefined',
      // The schema runner executes outside the Nitro dev pipeline, so mirror
      // its import.meta.dev and the dev-database gate for any code it loads.
      'import.meta.dev': 'true',
      'import.meta.env.NITRO_DRIZZLE_DEV': env.NITRO_DRIZZLE_DEV === 'false'
        ? 'false'
        : 'undefined',
      '__GRAPHQL_SCHEMA_EXPORT__': JSON.stringify(options.schemaExport),
    },
  })

  const graphqlOutput = resolve(root, options.outputs.graphql)
  const gazaniaOutput = resolve(root, options.outputs.gazania)
  await mkdir(dirname(graphqlOutput), { recursive: true })
  await mkdir(dirname(gazaniaOutput), { recursive: true })

  let updated = await updateFile(graphqlOutput, artifacts.graphql)
  updated = await updateFile(gazaniaOutput, artifacts.gazania) || updated

  if (updated) {
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
    const result = printChain.then(
      () => printGraphqlSchema(root, options, printOptions),
    )
    printChain = result
      .catch((error: unknown) => {
        logger.error('Failed to print schema:', error)
      })
    return result
  }

  return {
    name: 'graphql-schema',
    apply: 'serve',
    configResolved(config) {
      root = config.root
    },
    // Awaited during createServer so the artifacts exist before dev serves.
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
