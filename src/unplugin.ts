import type { UnpluginContextMeta, UnpluginOptions } from 'unplugin'
import { existsSync } from 'node:fs'
import defu from 'defu'
import { isPackageExists } from 'local-pkg'
import { createCommonJS } from 'mlly'
import { join } from 'pathe'
import { globSync } from 'tinyglobby'
import { createUnplugin } from 'unplugin'
import AutoImport from 'unplugin-auto-import'
import AutoImportComponents from 'unplugin-vue-components'

export interface PluginOptions {
  prefix?: string
  dts?: boolean | {
    components?: boolean | string
    autoImport?: boolean | string
  }
  importStyle?: boolean
}

const defaultOptions = {
  prefix: 'P', // TODO: replace with your prefix
  dts: isPackageExists('typescript'),
  importStyle: true,
} satisfies PluginOptions

const { __dirname } = createCommonJS(import.meta.url)
export const srcdir = __dirname

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

  const components = globSync('**/*.vue', { cwd: join(__dirname, 'components') })
  const componentNames = new Set(components.map(c => `${options.prefix}${c.replace(/\.vue$/, '')}`))
  const sideEffects = getSideEffect(options)

  return AutoImportComponents[framework]({
    dts: dtsEnabled ? dts : false,
    // exclude: [
    //   '**/node_modules/**',
    //   '**/.git/**',
    //   '**/.nuxt/**',
    // ],
    resolvers: [
      (componentName) => {
        if (componentNames.has(componentName)) {
          const from = join(__dirname, 'components', `${componentName.slice(options.prefix.length)}.vue`)
          return { name: 'default', from, sideEffects }
        }
      },
    ],
  }) satisfies UnpluginOptions
}
function getSideEffect(options: Required<PluginOptions>) {
  if (!options.importStyle) {
    return undefined
  }

  const possible = [
    join(__dirname, 'styles', 'index.css'),
    join(__dirname, 'styles', 'index.scss'),
  ]

  return possible.find(p => existsSync(p))
}

function AutoImportPlugin(framework: UnpluginContextMeta['framework'], options: Required<PluginOptions>) {
  const dtsInit = typeof options.dts === 'boolean' ? options.dts : options.dts.autoImport
  const dtsEnabled = !!dtsInit
  const dts = typeof dtsInit === 'string' ? dtsInit : 'package-name.d.ts'

  return AutoImport[framework]({
    dts: dtsEnabled ? dts : false,
    dirs: [
      join(__dirname, 'composables'),
      join(__dirname, 'utils'),
    ],
  }) satisfies UnpluginOptions
}
