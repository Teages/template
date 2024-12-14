import type { UnpluginContextMeta, UnpluginOptions } from 'unplugin'

import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import defu from 'defu'
import { isPackageExists } from 'local-pkg'
import { join } from 'pathe'
import { createUnplugin } from 'unplugin'
import AutoImport from 'unplugin-auto-import'
import AutoImportComponents from 'unplugin-vue-components'

import componentExportMeta from './components-meta'

export interface PluginOptions {
  prefix?: string
  dts?: boolean | {
    components?: boolean | string
    autoImport?: boolean | string
  }
  importStyle?: boolean
}

const defaultOptions = {
  prefix: 'P', // TODO: replace with your default prefix
  dts: isPackageExists('typescript'),
  importStyle: true,
} satisfies PluginOptions

const srcdir = fileURLToPath(new URL('.', import.meta.url))
function resolve(...paths: string[]) {
  return join(srcdir, ...paths)
}

export const plugin = createUnplugin<PluginOptions | undefined>((_options = {}, meta) => {
  const options = defu(_options, defaultOptions)

  return [
    AutoImportPlugin(meta.framework, options),
    ComponentImportPlugin(meta.framework, options),
  ]
})

function ComponentImportPlugin(framework: UnpluginContextMeta['framework'], options: Required<PluginOptions>) {
  const dtsInit = typeof options.dts === 'boolean' ? options.dts : options.dts.components
  const dtsEnabled = !!dtsInit
  const dts = typeof dtsInit === 'string' ? dtsInit : 'package-name-components.d.ts'

  const names = new Set(Object.keys(componentExportMeta))
  const from = resolve()
  const sideEffects = getSideEffect(options)

  return AutoImportComponents[framework]({
    dts: dtsEnabled ? dts : false,
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
function getSideEffect(options: Required<PluginOptions>) {
  if (!options.importStyle) {
    return undefined
  }

  return getPossibleFile([
    resolve('styles', 'index.css'),
    resolve('styles', 'index.scss'),
  ])
}

function getPossibleFile(possible: string[]) {
  return possible.find(p => existsSync(p))
}

function AutoImportPlugin(framework: UnpluginContextMeta['framework'], options: Required<PluginOptions>) {
  const dtsInit = typeof options.dts === 'boolean' ? options.dts : options.dts.autoImport
  const dtsEnabled = !!dtsInit
  const dts = typeof dtsInit === 'string' ? dtsInit : 'package-name.d.ts'

  return AutoImport[framework]({
    dts: dtsEnabled ? dts : false,
    dirs: [
      resolve('composables'),
      resolve('utils'),
    ],
  }) satisfies UnpluginOptions
}
