import process from 'node:process'
import { builder } from './builder'

import.meta.glob('./schema/*/operations/*.ts', { eager: true })
import.meta.glob('./schema/*/*.*.ts', { eager: true })

export const schema = builder.toSchema()

// this function should not be bundled in production
export async function generateSchemaFile() {
  const { generate } = await import('gazania/codegen')
  const { printSchema: printGraphQLSchema } = await import('graphql')

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
    const { resolve } = await import('node:path')
    const { readFile, writeFile } = await import('node:fs/promises')
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
