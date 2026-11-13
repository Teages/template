import fs, { glob } from 'node:fs/promises'
import process from 'node:process'

import { resolve as _resolve } from 'pathe'

export const codegenHead = `
/* eslint-disable eslint-comments/no-unlimited-disable */
/* eslint-disable */
/* This file is auto-generated */
`.trim()

export async function globFiles(patterns: string | string[], cwd: string) {
  const files: string[] = []
  for await (const file of glob(patterns, { cwd })) {
    files.push(file.replaceAll('\\', '/'))
  }
  return files.sort()
}

export function resolve(...paths: string[]) {
  return _resolve(process.cwd(), './src', ...paths)
}

export function normalizeFrom(path: string) {
  return path
    .replace(/\.ts$/, '')
    .replace(/\/index$/, '')
    .replace(/\/$/, '')
}

const CASE_SEPARATORS = new Set(['-', '_', '/', '.'])
const NUMBER_RE = /\d/

function isUpperChar(char: string) {
  if (NUMBER_RE.test(char)) {
    return undefined
  }
  return char !== char.toLowerCase()
}

function splitByCase(str: string) {
  const parts: string[] = []
  let buffer = ''
  let previousUpper: boolean | undefined
  let previousSplitter = false

  for (const char of str) {
    if (CASE_SEPARATORS.has(char)) {
      parts.push(buffer)
      buffer = ''
      previousUpper = undefined
      previousSplitter = true
      continue
    }

    const upper = isUpperChar(char)
    if (!previousSplitter) {
      if (previousUpper === false && upper === true) {
        parts.push(buffer)
        buffer = char
        previousUpper = upper
        continue
      }
      if (previousUpper === true && upper === false && buffer.length > 1) {
        parts.push(buffer.slice(0, -1))
        buffer = buffer.slice(-1) + char
        previousUpper = upper
        continue
      }
    }

    buffer += char
    previousUpper = upper
    previousSplitter = false
  }

  parts.push(buffer)
  return parts
}

function upperFirst(str: string) {
  return str
    ? str[0].toUpperCase() + str.slice(1)
    : ''
}

export function pascalCase(str: string) {
  return str
    ? splitByCase(str).map(part => upperFirst(part)).join('')
    : ''
}

export function getComponentName(_path: string) {
  const paths = _path
    .replace(/\.vue$/, '')
    .split('/')
  const base = pascalCase(paths.pop()!)
  const prefix = pascalCase(paths.join('/'))

  return base.startsWith(prefix)
    ? base
    : `${prefix}${base}`
}

export async function updateFile(path: string, content: string) {
  const filePath = resolve(path)

  const old = await fs.readFile(filePath, 'utf-8').catch(() => null)
  if (old !== content) {
    await fs.writeFile(filePath, content, 'utf-8')
    console.log(`Updated ${path}`)
  }
  else {
    console.log(`${path} is up-to-date`)
  }
}
