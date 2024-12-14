import type { ESMImport } from 'knitwork'
import fs from 'node:fs/promises'
import { genExport, genTypeExport } from 'knitwork'
import { findExports, findTypeExports } from 'mlly'
import { extname } from 'pathe'
import { glob } from 'tinyglobby'
import { parse } from 'vue/compiler-sfc'
import { codegenHead, getComponentName, resolve, updateFile } from '../utils'

const indexFilePath = 'index.ts'

interface AnalyzedExport {
  type?: boolean
  from: string
  names: ESMImport[]
}

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

async function scanUtils() {
  const res: Array<AnalyzedExport> = []

  const files = await glob([
    'composables/*.ts',
    'composables/*/index.ts',
    'utils/*.ts',
    'utils/*/index.ts',
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

function normalizeFrom(path: string) {
  const from = path
    .replace(/\.ts$/, '')
    .replace(/\/index$/, '')
    .replace(/\/$/, '')

  return `./${from}`
}

export default async function () {
  const scanned = [
    await scanComponentsTypes(),
    await scanUtils(),
    await scanComponents(),
  ].flat()

  const typeOutput = scanned
    .filter(item => item.type)
    .map(item => genTypeExport(item.from, item.names))
  const nonTypeOutput = scanned
    .filter(item => !item.type)
    .map(item => genExport(item.from, item.names))

  const output = [
    codegenHead,
    ...typeOutput,
    '',
    ...nonTypeOutput,
    '',
  ].join('\n')

  await updateFile(indexFilePath, output)
}
