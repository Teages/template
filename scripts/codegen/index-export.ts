import type { AnalyzedExport } from './export-meta'
import fs from 'node:fs/promises'
import { genExport, genTypeExport } from 'knitwork'
import { findTypeExports } from 'mlly'
import { extname } from 'pathe'
import { glob } from 'tinyglobby'
import { parse } from 'vue/compiler-sfc'
import { codegenHead, normalizeFrom, resolve, updateFile } from '../utils'
import { scanComponents, scanTsFile } from './export-meta'

const indexFilePath = 'index.ts'

async function scanComponentsTypes() {
  const res: Array<AnalyzedExport> = []

  const files = await glob([
    'components/**/*.vue',
    'components/**/*.ts',
  ], { cwd: resolve() })

  for (const file of files) {
    const from = normalizeFrom(file)

    const raw = await fs.readFile(resolve(file), 'utf-8')
    const content = extname(file) === '.vue'
      ? parse(raw).descriptor.script?.content ?? ''
      : raw

    const names = findTypeExports(content)
      .map(item => item.name!)
      .filter(name => !!name && name !== 'default')

    res.push({ names, from, type: true })
  }

  return res
}

export default async function () {
  const scanned = [
    await scanComponentsTypes(),
    await scanTsFile('composables'),
    await scanTsFile('utils'),
    await scanComponents(),
  ].flat()

  const typeOutput = scanned
    .filter(item => item.type)
    .map(item => genTypeExport(`./${item.from}`, item.names))
  const nonTypeOutput = scanned
    .filter(item => !item.type)
    .map(item => genExport(`./${item.from}`, item.names))

  const output = [
    codegenHead,
    ...typeOutput,
    '',
    ...nonTypeOutput,
    '',
  ].join('\n')

  await updateFile(indexFilePath, output)
}
