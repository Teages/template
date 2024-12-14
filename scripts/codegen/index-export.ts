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

async function scanTypes() {
  const res: Array<AnalyzedExport> = []

  const files = (await glob([
    'composables/*.ts',
    'composables/*/index.ts',
    'utils/*.ts',
    'utils/*/index.ts',
    'components/**/*.vue',
    'components/**/*.ts',
  ], { cwd: resolve() }))

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

function compare(a: AnalyzedExport, b: AnalyzedExport) {
  if (a.type && !b.type) {
    return -1
  }
  if (!a.type && b.type) {
    return 1
  }

  if (a.from !== b.from) {
    return a.from < b.from ? -1 : 1
  }

  return 0
}
export default async function () {
  const scanned = [
    await scanTypes(),
    await scanTsFile('composables'),
    await scanTsFile('utils'),
    await scanComponents(),
  ].flat()

  const res = scanned
    .filter(item => item.names.length)
    .sort((a, b) => compare(a, b))
    .map(
      item => item.type
        ? genTypeExport(`./${item.from}`, item.names)
        : genExport(`./${item.from}`, item.names),
    )
  const output = [
    codegenHead,
    ...res,
    '',
  ].join('\n')
  await updateFile(indexFilePath, output)
}
