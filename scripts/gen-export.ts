import type { ESMImport } from 'knitwork'
import fs from 'node:fs/promises'
import process from 'node:process'
import { genExport, genTypeExport } from 'knitwork'
import { findExports, findTypeExports } from 'mlly'
import { extname, resolve } from 'pathe'
import { pascalCase } from 'scule'
import { glob } from 'tinyglobby'
import { parse } from 'vue/compiler-sfc'

const srcDir = resolve(process.cwd(), './src')
const indexFilePath = 'index.ts'
const componentFilePath = 'components.ts'

const outputHead = `
/* eslint-disable eslint-comments/no-unlimited-disable */
/* eslint-disable */
/* This file is auto-generated */
`.trim()

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
  ], { cwd: srcDir })

  for (const file of files) {
    const from = normalizeFrom(file)

    const raw = await fs.readFile(resolve(srcDir, file), 'utf-8')
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

async function scanComponents() {
  const res: Array<AnalyzedExport> = []

  const files = await glob([
    'components/**/*.vue',
  ], { cwd: srcDir })

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
function getComponentName(_path: string) {
  const paths = _path
    .replace(/\.vue$/, '')
    .split('/')
  const base = pascalCase(paths.pop()!)
  const prefix = pascalCase(paths.join('/'))

  return base.startsWith(prefix) ? base : `${prefix}${base}`
}

async function scanUtils() {
  const res: Array<AnalyzedExport> = []

  const files = await glob([
    'composables/*.ts',
    'composables/*/index.ts',
    'utils/*.ts',
    'utils/*/index.ts',
  ], { cwd: srcDir })

  for (const file of files) {
    const from = normalizeFrom(file)

    const content = await fs.readFile(resolve(srcDir, file), 'utf-8')
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

async function main() {
  const scannedComponents = await scanComponents()
  const componentOutput = `${outputHead}\n${
    scannedComponents
      .map(item => genExport(item.from, item.names))
      .join('\n')
  }`

  const scanned = [
    await scanComponentsTypes(),
    await scanUtils(),
  ].flat()

  const typeOutput = scanned
    .filter(item => item.type)
    .map(item => genTypeExport(item.from, item.names))
  const nonTypeOutput = scanned
    .filter(item => !item.type)
    .map(item => genExport(item.from, item.names))

  const output = [
    outputHead,
    ...typeOutput,
    '',
    ...nonTypeOutput,
    '',
    genExport('./components', '*'),
    '',
  ].join('\n')

  await updateFile(componentFilePath, componentOutput)
  await updateFile(indexFilePath, output)
}
async function updateFile(path: string, content: string) {
  const filePath = resolve(srcDir, path)

  const old = await fs.readFile(filePath, 'utf-8').catch(() => null)
  if (old !== content) {
    await fs.writeFile(filePath, content, 'utf-8')
    console.log(`Updated ${filePath}`)
  }
  else {
    console.log(`${path} is up-to-date`)
  }
}

main()
  .catch(err => console.error('Error while updating index.ts:', err))
