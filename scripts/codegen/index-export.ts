import type { AnalyzedExport, ExportName } from './export-meta.ts'
import fs from 'node:fs/promises'
import { findTypeExports } from 'mlly'
import { extname } from 'pathe'
import { parse } from 'vue/compiler-sfc'
import { codegenHead, globFiles, normalizeFrom, resolve, updateFile } from '../utils.ts'
import { scanComponents, scanTsFile } from './export-meta.ts'

const indexFilePath = 'index.ts'

type ExportEntry = string | ExportName

function genStatement(type: 'export' | 'export type', specifier: string, names: ExportEntry[]) {
  const entries = names.map((entry) => {
    if (typeof entry === 'string') {
      return entry
    }
    return entry.as && entry.as !== entry.name
      ? `${entry.name} as ${entry.as}`
      : entry.name
  })

  return `${type} { ${entries.join(', ')} } from ${JSON.stringify(specifier)};`
}

function genExport(specifier: string, names: ExportEntry[]) {
  return genStatement('export', specifier, names)
}

function genTypeExport(specifier: string, names: ExportEntry[]) {
  return genStatement('export type', specifier, names)
}

async function scanTypes() {
  const res: Array<AnalyzedExport> = []

  const files = await globFiles([
    'composables/*.ts',
    'composables/*/index.ts',
    'utils/*.ts',
    'utils/*/index.ts',
    'components/**/*.vue',
    'components/**/*.ts',
  ], resolve())

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
    return a.from < b.from
      ? -1
      : 1
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
