import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import process from 'node:process'
import { builder } from './builder'

import.meta.glob('./schema/*/operations/*.ts', { eager: true })
import.meta.glob('./schema/*/*.*.ts', { eager: true })

export const schema = builder.toSchema()

// this function should not be bundled in production
export async function generateSchemaFile() {
  const { generate } = await import('gazania/codegen')
  // [nuxt5-nightly] import the CJS entry explicitly: the nightly's runner
  // resolves bare "graphql" to the ESM entry here but loads the schema's
  // pothos chain against the CJS entry, splitting graphql into two realms
  // and making printSchema() throw "from another module or realm".
  // "graphql/index.js" deterministically hits the same realm as the schema.
  const { printSchema: printGraphQLSchema } = await import('graphql/index.js')

  const sdl = printGraphQLSchema(schema)
  const type = generate({
    source: sdl,
    scalars: {
      Date: 'string',
      UUID: 'string',
    },
    url: 'http://localhost',
  })

  return { sdl, type }
}

if (import.meta.dev && process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
  async function updateFile(path: string, content: string) {
    const resolvedPath = resolve(import.meta.dirname, '../../shared', path)
    const existing = await readFile(resolvedPath, 'utf-8').catch(() => null)
    if (existing !== content) {
      await writeFile(resolvedPath, content)
      return true
    }
    return false
  }

  async function printSchema() {
    const { logger: serverLogger } = await import('#server/utils/logger.ts')
    const logger = serverLogger.withTag('graphql')

    let updated = false

    const { sdl, type } = await generateSchemaFile()

    if (await updateFile('./schema.graphql', sdl)) {
      updated = true
    }
    if (await updateFile('./gazania.ts', type)) {
      updated = true
    }

    if (updated) {
      logger.info('Schema updated.')
    }
    // eslint-disable-next-line ts/no-unsafe-member-access
    else if (!import.meta.hot?.data?.graphqlSchemaPrintInit) {
      logger.info('Schema is up to date.')
    }

    if (import.meta.hot) {
      // eslint-disable-next-line ts/no-unsafe-member-access
      import.meta.hot.data.graphqlSchemaPrintInit = true
    }
  }
  const promise = printSchema()
  if (import.meta.env.UPDATE_SCHEMA) {
    // eslint-disable-next-line antfu/no-top-level-await
    await promise
  }
}
