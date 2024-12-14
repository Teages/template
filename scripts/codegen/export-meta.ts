import type { ESMImport } from 'knitwork'
import fs from 'node:fs/promises'
import { findExports } from 'mlly'
import { glob } from 'tinyglobby'
import { codegenHead, getComponentName, normalizeFrom, resolve, updateFile } from '../utils'

const exportMetaFilePath = 'export-meta.ts'

export interface AnalyzedExport {
  type?: boolean
  from: string
  names: ESMImport[]
}

export async function scanComponents() {
  const res: Array<AnalyzedExport> = []

  const files = await glob([
    'components/**/*.vue',
  ], { cwd: resolve() })

  for (const file of files) {
    const from = normalizeFrom(file)
    const names = [{
      name: 'default',
      as: getComponentName(file.replace(/^components\//, '')),
    }]

    res.push({
      names,
      from,
    })
  }

  return res
}

export async function scanTsFile(dir: string) {
  const res: Array<AnalyzedExport> = []

  const files = await glob([
    `${dir}/*.ts`,
    `${dir}/*/index.ts`,
  ], { cwd: resolve() })

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
