import fs from 'node:fs/promises'
import process from 'node:process'

import { resolve as _resolve } from 'pathe'
import { pascalCase } from 'scule'

export const codegenHead = `
/* eslint-disable eslint-comments/no-unlimited-disable */
/* eslint-disable */
/* This file is auto-generated */
`.trim()

export function resolve(...paths: string[]) {
  return _resolve(process.cwd(), './src', ...paths)
}

export function getComponentName(_path: string) {
  const paths = _path
    .replace(/\.vue$/, '')
    .split('/')
  const base = pascalCase(paths.pop()!)
  const prefix = pascalCase(paths.join('/'))

  return base.startsWith(prefix) ? base : `${prefix}${base}`
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
