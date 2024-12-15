import type { UnpluginContextMeta, UnpluginOptions } from 'unplugin'

import { fileURLToPath } from 'node:url'

import defu from 'defu'
import { isPackageExists } from 'local-pkg'
import { join, normalize } from 'pathe'
import { defineUnimportPreset } from 'unimport'
import Unimport from 'unimport/unplugin'
import { createUnplugin } from 'unplugin'
import AutoImportComponents from 'unplugin-vue-components'

import exportMeta from './export-meta'

export interface PluginOptions {
  prefix?: string
  dts?: boolean | string
  importStyle?: boolean
}

const defaultOptions = {
  prefix: 'P', // TODO: replace with your default prefix
  dts: isPackageExists('typescript'),
  importStyle: true,
} satisfies PluginOptions

const __filename = fileURLToPath(import.meta.url)
const isDist = !__filename.endsWith('.ts')

const srcdir = isDist ? 'package-name' : normalize(fileURLToPath(new URL('.', import.meta.url)))
function resolve(...paths: string[]) {
  const base = srcdir.endsWith('/') ? srcdir.slice(0, -1) : srcdir
  if (paths.length === 0) {
    return base
  }

  return join(base, ...paths)
}

function getSideEffect(options: Required<PluginOptions>) {
  if (!options.importStyle) {
    return undefined
  }
  return isDist ? resolve('styles') : resolve('styles', 'index.scss')
}
function componentImportPlugin(framework: UnpluginContextMeta['framework'], options: Required<PluginOptions>) {
  const names = new Set(Object.keys(exportMeta.components))
  const from = resolve()
  const sideEffects = getSideEffect(options)

  return AutoImportComponents[framework]({
    dts: false,
    types: [],
    resolvers: [
      (componentName) => {
        if (!componentName.startsWith(options.prefix)) {
          return
        }
        const name = componentName.slice(options.prefix.length)

        if (names.has(name)) {
          return { name, from, sideEffects }
        }
      },
    ],
  }) satisfies UnpluginOptions
}

const dtsHeader = `
/* eslint-disable */
/* prettier-ignore */
// @ts-nocheck
// noinspection JSUnusedGlobalSymbols
// Generated by package-name
// biome-ignore lint: disable
`.trim()
function componentDts(prefix: string) {
  const template = (name: string) => {
    const componentName = `${prefix}${name}`
    return `    ${componentName}: typeof import('${resolve()}')['${name}']`
  }

  return `
declare module 'vue' {
  export interface GlobalComponents {
${Object.keys(exportMeta.components).map(template).join('\n')}
  }
}
  `.trim()
}

export const unimportPreset = defineUnimportPreset({
  from: resolve(),
  imports: [
    ...Object.keys(exportMeta.composables),
    ...Object.keys(exportMeta.utils),
  ],
})
function unimportPlugin(framework: UnpluginContextMeta['framework'], options: Required<PluginOptions>) {
  const dts = options.dts === true ? 'package-name.d.ts' : options.dts

  return Unimport[framework]({
    presets: [unimportPreset],
    dts,
    addons: {
      addons: [{
        declaration: (dts) => {
          return `${[dtsHeader, dts, componentDts(options.prefix)].join('\n\n')}\n`
        },
      }],
    },
  }) satisfies UnpluginOptions
}

export const plugin = createUnplugin<PluginOptions | undefined>((_options = {}, meta) => {
  const options = defu(_options, defaultOptions)

  return [
    unimportPlugin(meta.framework, options),
    componentImportPlugin(meta.framework, options),
  ]
})
