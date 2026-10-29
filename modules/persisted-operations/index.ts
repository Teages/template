import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { extract, parseTSConfig, validateManifest } from 'gazania/extract'
import { buildASTSchema, parse } from 'graphql'
import { addServerTemplate, addTypeTemplate, defineNuxtModule, useLogger } from 'nuxt/kit'
import * as ts from 'typescript'

export interface ModuleOptions {
  /** Directory scanned for Gazania operations, relative to the project root. */
  dir?: string
  /** TypeScript config used for type-aware extraction, relative to the project root. */
  tsconfig?: string
  /** GraphQL SDL used to validate extracted operations, relative to the project root. */
  schema?: string
}

const VIRTUAL_ID = '#graphql/persisted-operations'

/**
 * Extracts Gazania operations into the Nitro virtual module
 * `#graphql/persisted-operations`. Yoga allows only those documents in production.
 */
export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'persisted-operations',
    configKey: 'persistedOperations',
  },
  defaults: {
    dir: 'app',
    schema: 'shared/schema.graphql',
  },
  setup(options, nuxt) {
    const logger = useLogger('persisted-operations')
    const tsconfig = options.tsconfig ?? resolve(nuxt.options.buildDir, 'tsconfig.app.json')

    const declaration = addTypeTemplate({
      filename: 'types/persisted-operations.d.ts',
      getContents: () => `declare const operations: Readonly<Record<string, string>>

export default operations
`,
    }, { nuxt: true, nitro: true })

    // The virtual id is not a file. Point TypeScript at the generated declaration.
    nuxt.hook('prepare:types', (opts) => {
      for (const config of [opts.tsConfig, opts.serverTsConfig]) {
        config.compilerOptions ??= {}
        config.compilerOptions.paths ??= {}
        config.compilerOptions.paths[VIRTUAL_ID] = [declaration.dst]
      }
    })

    addServerTemplate({
      filename: VIRTUAL_ID,
      getContents: async () => {
        const operations = await extractPersistedOperations(nuxt.options.rootDir, {
          dir: options.dir ?? 'app',
          tsconfig,
          schema: options.schema ?? 'shared/schema.graphql',
        })
        logger.success(`Allowlisted ${Object.keys(operations).length} GraphQL operations`)
        return `export default ${JSON.stringify(operations)}\n`
      },
    })
  },
})

interface ExtractSettings {
  dir: string
  tsconfig: string
  schema: string
}

async function extractPersistedOperations(rootDir: string, settings: ExtractSettings) {
  const tsconfigPath = resolve(rootDir, settings.tsconfig)
  const scanDir = resolve(rootDir, settings.dir)
  const schemaPath = resolve(rootDir, settings.schema)

  let manifest
  try {
    const parsed = parseTSConfig(ts, tsconfigPath, ts.sys)
    const result = await extract({
      dir: scanDir,
      tsconfig: parsed,
      basePath: rootDir,
      hash: body => createHash('sha256').update(body).digest('hex'),
    })
    manifest = result.manifest
  }
  catch (error) {
    throw formatExtractError(error)
  }

  const sdl = await readFile(schemaPath, 'utf8')
  const { errors } = validateManifest(manifest, buildASTSchema(parse(sdl)))
  if (errors.length > 0) {
    const details = errors
      .map(error => `${error.loc.file}:${error.loc.start.line} ${error.message}`)
      .join('\n')
    throw new Error(`Persisted operations do not match ${settings.schema}:\n${details}`)
  }

  const operations: Record<string, string> = {}
  for (const [name, entry] of Object.entries(manifest.operations)) {
    const existing = operations[entry.hash]
    if (existing !== undefined && existing !== entry.body)
      throw new Error(`Persisted operation hash collision for "${name}"`)
    operations[entry.hash] = entry.body
  }
  return operations
}

interface SkippedExtraction {
  file: string
  line: number
  reason: string
}

function formatExtractError(error: unknown): Error {
  if (!isExtractionError(error)) {
    return error instanceof Error
      ? error
      : new Error(String(error))
  }

  const details = error.skipped
    .map(item => `${item.file}:${item.line} ${item.reason}`)
    .join('\n')
  return new Error(`Gazania could not extract persisted operations:\n${details}`, { cause: error })
}

function isExtractionError(error: unknown): error is Error & { skipped: SkippedExtraction[] } {
  if (!(error instanceof Error) || !('skipped' in error))
    return false
  const skipped: unknown = error.skipped
  return Array.isArray(skipped) && skipped.every(isSkippedExtraction)
}

function isSkippedExtraction(value: unknown): value is SkippedExtraction {
  if (value == null || typeof value !== 'object')
    return false
  if (!('file' in value) || !('line' in value) || !('reason' in value))
    return false
  return typeof value.file === 'string'
    && typeof value.line === 'number'
    && typeof value.reason === 'string'
}
