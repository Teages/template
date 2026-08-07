/* eslint-disable antfu/no-top-level-await --
   runnerImport closes the module runner after evaluation finishes.
   The schema dynamic import must complete during evaluation. */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { generate } from 'gazania/codegen'
import { isSchema, printSchema } from 'graphql'

export interface GraphqlCodegenConfig {
  readonly schema: string
  readonly schemaExport: string
  readonly outputs: {
    readonly graphql: string
    readonly gazania: string
  }
}

// Injected by plugins/graphql-schema via runnerImport `define`.
declare const __GRAPHQL_CODEGEN_CONFIG__: GraphqlCodegenConfig

async function updateFile(path: string, content: string): Promise<boolean> {
  const existing = await readFile(path, 'utf-8').catch(() => null)
  if (existing === content)
    return false
  await writeFile(path, content)
  return true
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Top-level await keeps the Vite module runner alive for the schema import.
 * Call sites should read `artifactsUpdated` after `runnerImport`.
 */
const config = __GRAPHQL_CODEGEN_CONFIG__

const schemaModule: unknown = await import(
  /* @vite-ignore */ config.schema,
) as unknown
if (!isRecord(schemaModule))
  throw new Error(`Expected a module object from ${config.schema}`)
const schema = schemaModule[config.schemaExport]
if (!isSchema(schema)) {
  throw new Error(
    `Expected GraphQL schema export "${config.schemaExport}" from ${config.schema}`,
  )
}

await mkdir(dirname(config.outputs.graphql), { recursive: true })
await mkdir(dirname(config.outputs.gazania), { recursive: true })

const sdl = printSchema(schema)
let updated = await updateFile(config.outputs.graphql, sdl)

const types = generate({ source: sdl, scalars: {}, url: 'http://localhost' })
  .replace('/* eslint-disable */\n', '')
updated = await updateFile(config.outputs.gazania, types) || updated

export const artifactsUpdated = updated
