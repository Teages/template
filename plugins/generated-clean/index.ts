import type { Plugin } from 'vite'
import { mkdir, readdir, rm } from 'node:fs/promises'
import { cwd } from 'node:process'
import { join, resolve } from 'pathe'

export async function clearGeneratedDir(rootDir: string): Promise<void> {
  const generatedDir = resolve(rootDir, 'node_modules/.generated')
  await mkdir(generatedDir, { recursive: true })
  const entries = await readdir(generatedDir)
  await Promise.all(
    entries.map(entry => rm(join(generatedDir, entry), { recursive: true, force: true })),
  )
}

export function generatedCleanPlugin(): Plugin {
  return {
    name: 'internal:generated-clean',
    async config(userConfig) {
      await clearGeneratedDir(userConfig.root ?? cwd())
    },
  }
}
