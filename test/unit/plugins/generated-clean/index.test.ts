import { mkdir, mkdtemp, readdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { clearGeneratedDir } from '~/plugins/generated-clean/index'

describe('clearGeneratedDir', () => {
  it('empties every entry including nested dirs and incremental caches', async () => {
    const rootDir = await mkdtemp(join(tmpdir(), 'generated-clean-'))
    const generatedDir = join(rootDir, '.generated')
    await mkdir(join(generatedDir, 'app'), { recursive: true })
    await Promise.all([
      writeFile(join(generatedDir, 'app', 'stale-component.d.ts'), ''),
      writeFile(join(generatedDir, 'stale-tsconfig.json'), ''),
      writeFile(join(generatedDir, 'tsconfig.app.tsbuildinfo'), '{}'),
    ])

    await clearGeneratedDir(rootDir)

    await expect(readdir(generatedDir)).resolves.toEqual([])
  })

  it('creates the directory when it does not exist yet', async () => {
    const rootDir = await mkdtemp(join(tmpdir(), 'generated-clean-'))

    await clearGeneratedDir(rootDir)

    await expect(readdir(join(rootDir, '.generated'))).resolves.toEqual([])
  })
})
