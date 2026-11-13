import fs from 'node:fs/promises'
import { findExports } from 'mlly'
import { codegenHead, getComponentName, globFiles, normalizeFrom, resolve, updateFile } from '../utils.ts'

const exportMetaFilePath = 'export-meta.ts'

export interface ExportName {
  name: string
  as?: string
}

export interface AnalyzedExport {
  type?: boolean
  from: string
  names: Array<string | ExportName>
}

export async function scanComponents() {
  const res: Array<AnalyzedExport> = []

  const files = await globFiles([
    'components/**/*.vue',
  ], resolve())

  for (const file of files) {
    const from = normalizeFrom(file)
    const names = [
      {
        name: 'default',
        as: getComponentName(file.replace(/^components\//, '')),
      },
    ]

    res.push({
      names,
      from,
    })
  }

  return res
}

export async function scanTsFile(dir: string) {
  const res: Array<AnalyzedExport> = []

  const files = await globFiles([
    `${dir}/*.ts`,
    `${dir}/*/index.ts`,
  ], resolve())

  for (const file of files) {
    const from = normalizeFrom(file)

    const content = await fs.readFile(resolve(file), 'utf-8')
    const names = findExports(content)
      .map(item => item.name!)
      .filter(name => !!name)

    res.push({ names, from })
  }

  return res
}

function analyzeExportMeta(analyzed: AnalyzedExport[]) {
  return Object.fromEntries(
    analyzed.map((component) => {
      const nameInit = component.names[0]
      const name = typeof nameInit === 'string'
        ? nameInit
        : nameInit.as

      if (name) {
        return [name, component.from] as const
      }
      return null
    }).filter(item => !!item),
  )
}

export default async function () {
  const components = analyzeExportMeta(await scanComponents())
  const utils = analyzeExportMeta(await scanTsFile('utils'))
  const composables = analyzeExportMeta(await scanTsFile('composables'))

  const output = [
    codegenHead,
    `export default ${JSON.stringify({ components, composables, utils }, null, 2)} as const`,
    '',
  ].join('\n')
  updateFile(exportMetaFilePath, output)
}
