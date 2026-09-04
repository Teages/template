import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'

describe('graphql schema', async () => {
  const distDir = resolve(import.meta.dirname, '../../shared')
  const { generateSchemaFile } = await import('#server/graphql/schema.ts')
  let sdl: string
  let type: string

  beforeAll(async () => {
    const result = await generateSchemaFile()
    sdl = result.sdl
    type = result.type
  })

  it('should graphql schema up to date', async () => {
    const current = await readFile(resolve(distDir, 'schema.graphql'), 'utf-8')
      .catch(() => null)
    expect(current).not.toBeNull()
    expect(current).toEqual(sdl)
  })

  it('should gazania types up to date', async () => {
    const current = await readFile(resolve(distDir, 'gazania.ts'), 'utf-8')
      .catch(() => null)
    expect(current).not.toBeNull()
    expect(current).toEqual(type)
  })
})
