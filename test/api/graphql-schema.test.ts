import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { generate as generateGazania } from 'gazania/codegen'
import { printSchema } from 'graphql'
import { describe, expect, it } from 'vitest'

describe('graphql schema', async () => {
  const distDir = resolve(import.meta.dirname, '../../shared')
  const { schema } = await import('#server/graphql/schema.ts')

  it('should graphql schema up to date', async () => {
    const current = await readFile(resolve(distDir, 'schema.graphql'), 'utf-8')
      .catch(() => null)
    expect(current).not.toBeNull()

    const sdl = printSchema(schema)
    expect(current).toEqual(sdl)
  })

  it('should gazania types up to date', async () => {
    const current = await readFile(resolve(distDir, 'gazania.ts'), 'utf-8')
      .catch(() => null)
    expect(current).not.toBeNull()

    const sdl = printSchema(schema)
    const types = generateGazania({
      source: sdl,
      scalars: {},
      url: 'http://localhost',
    })
    expect(current).toEqual(types)
  })
})
