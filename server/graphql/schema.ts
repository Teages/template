import process from 'node:process'
import { builder } from './builder'

import.meta.glob('./schema/*/operations/*.ts', { eager: true })
import.meta.glob('./schema/*/*.*.ts', { eager: true })

export const schema = builder.toSchema()

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
    const { generate } = await import('gazania/codegen')
    const { printSchema: printGraphQLSchema } = await import('graphql')
    const { logger: serverLogger } = await import('#server/utils/logger.ts')
    const logger = serverLogger.withTag('graphql')

    let updated = false

    const sdl = printGraphQLSchema(schema)
    if (await updateFile('./schema.graphql', sdl)) {
      updated = true
    }

    const types = generate({
      source: sdl,
      scalars: {},
      url: 'http://localhost',
    })
    if (await updateFile('./gazania.ts', types)) {
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
  void printSchema()
}
