import type { Nitro } from 'nitro/types'
import type { TSConfig } from 'pkg-types'
import type { Plugin } from 'vite'
import { relative } from 'node:path'
import { resolve } from 'pathe'
import { writeTSConfig } from 'pkg-types'

export default function tsconfigPlugin(): Plugin {
  let nitro: Nitro

  return {
    name: 'internal:tsconfig',
    nitro: {
      setup(_nitro) {
        nitro = _nitro
      },
    },

    async buildStart() {
      if (!nitro) {
        throw new Error('Nitro is not initialized')
      }

      const rootDir = nitro.options.rootDir
      const buildDir = nitro.options.buildDir

      const app = getAppTSConfig(rootDir, buildDir)
      const server = getServerTSConfig(rootDir, buildDir)
      const node = getNodeTSConfig(rootDir, buildDir)

      await nitro.hooks.callHook('prepare:types', { app, server, node })

      await Promise.all([
        writeTSConfig(resolve(buildDir, 'tsconfig.app.json'), app),
        writeTSConfig(resolve(buildDir, 'tsconfig.server.json'), server),
        writeTSConfig(resolve(buildDir, 'tsconfig.node.json'), node),
      ])
    },
  }
}

export function getAppTSConfig(rootDir: string, buildDir: string): TSConfig {
  const pathToRoot = (path: string) => relative(buildDir, resolve(rootDir, path))

  return {
    extends: [
      '@tsconfig/node24/tsconfig.json',
      '@vue/tsconfig/tsconfig.dom.json',
    ],
    compilerOptions: {
      rootDir: pathToRoot('.'),
      paths: {
        '~/*': [pathToRoot('./*')],
        '#build/ui': [pathToRoot('./node_modules/.nuxt-ui/ui')],
        '#build/ui/*': [pathToRoot('./node_modules/.nuxt-ui/ui/*')],
        '#generated/*': [pathToRoot('./.generated/*')],
      },
      types: ['node', 'vite/client', 'nitro/vite/types'],
      noUncheckedIndexedAccess: true,
    },
    include: [
      './types/nitro-routes.d.ts',
      pathToRoot('env.d.ts'),
      pathToRoot('.generated/app/**/*.ts'),
      pathToRoot('.generated/shared/**/*.ts'),
      pathToRoot('app/**/*.ts'),
      pathToRoot('app/**/*.vue'),
      pathToRoot('plugins/*/runtime/app/**/*.ts'),
    ],
  }
}

export function getServerTSConfig(rootDir: string, buildDir: string): TSConfig {
  const pathToRoot = (path: string) => relative(buildDir, resolve(rootDir, path))

  return {
    extends: 'nitro/tsconfig',
    compilerOptions: {
      rootDir: pathToRoot('.'),
      paths: {
        '~/*': [pathToRoot('./*')],
        '#generated/*': [pathToRoot('./.generated/*')],
      },
      types: ['node', 'vite/client', 'nitro/vite/types'],
      noUncheckedIndexedAccess: true,
    },
    include: [
      './types/nitro-config.d.ts',
      './types/nitro-imports.d.ts',
      './types/nitro-routes.d.ts',
      pathToRoot('env.d.ts'),
      pathToRoot('.generated/server/**/*.ts'),
      pathToRoot('.generated/shared/**/*.ts'),
      pathToRoot('server/**/*.ts'),
      pathToRoot('plugins/*/runtime/server/**/*.ts'),
      pathToRoot('test/e2e/app/**/*.ts'),
      pathToRoot('test/e2e/api/**/*.ts'),
      pathToRoot('test/setup.ts'),
      pathToRoot('test/utils.ts'),
    ],
  }
}

export function getNodeTSConfig(rootDir: string, buildDir: string): TSConfig {
  const pathToRoot = (path: string) => relative(buildDir, resolve(rootDir, path))

  return {
    extends: '@tsconfig/node24/tsconfig.json',
    compilerOptions: {
      module: 'Preserve',
      moduleResolution: 'Bundler',
      paths: {
        '~/*': [pathToRoot('./*')],
      },
      types: ['node'],
      allowImportingTsExtensions: true,
      noUncheckedIndexedAccess: true,
      noEmit: true,
    },
    include: [
      './types/nitro-config.d.ts',
      pathToRoot('env.d.ts'),
      pathToRoot('test/env-runner-bridge.ts'),
      pathToRoot('test/env.ts'),
      pathToRoot('test/global-setup.ts'),
      pathToRoot('test/plugin.ts'),
      pathToRoot('test/unit/**/*.ts'),
      pathToRoot('scripts/**/*.ts'),
      pathToRoot('plugins/**/*.ts'),
      pathToRoot('*.ts'),
    ],
    exclude: [
      pathToRoot('plugins/*/runtime/**/*.ts'),
    ],
  }
}

declare module 'nitro/types' {
  interface NitroHooks {
    'prepare:types': (configs: {
      app: TSConfig & { vueCompilerOptions?: VueCompilerOptions }
      server: TSConfig
      node: TSConfig
    }) => void
  }
}

interface VueCompilerOptions {
  // Core
  target?: 'auto' | number
  lib?: string
  typesRoot?: string

  // File handling
  extensions?: string[]
  vitePressExtensions?: string[]
  petiteVueExtensions?: string[]

  // Strictness
  strictTemplates?: boolean
  strictVModel?: boolean
  strictCssModules?: boolean
  checkUnknownProps?: boolean
  checkUnknownEvents?: boolean
  checkUnknownDirectives?: boolean
  checkUnknownComponents?: boolean

  // Type inference
  inferComponentDollarEl?: boolean
  inferComponentDollarRefs?: boolean
  inferTemplateDollarAttrs?: boolean
  inferTemplateDollarEl?: boolean
  inferTemplateDollarRefs?: boolean
  inferTemplateDollarSlots?: boolean

  // Template codegen
  skipTemplateCodegen?: boolean
  vapor?: boolean
  fallthroughAttributes?: boolean
  checkRequiredFallthroughAttributes?: boolean
  fallthroughComponentNames?: string[]
  dataAttributes?: string[]
  htmlAttributes?: string[]
  optionsWrapper?: [string, string] | []

  // Style
  resolveStyleImports?: boolean
  resolveStyleClassNames?: boolean | 'scoped'

  // Language features
  jsxSlots?: boolean

  macros?: Partial<{
    defineProps: string[]
    defineSlots: string[]
    defineEmits: string[]
    defineExpose: string[]
    defineModel: string[]
    defineOptions: string[]
    withDefaults: string[]
  }>

  composables?: Partial<{
    useAttrs: string[]
    useCssModule: string[]
    useSlots: string[]
    useTemplateRef: string[]
  }>

  // Plugins
  plugins?: Array<
    | string
    | {
      name: string
      [key: string]: unknown
    }
  >

  // Experimental
  experimentalModelPropName?: Record<
    string,
    Record<
      string,
      | boolean
      | Record<string, string>
      | Record<string, string>[]
    >
  >
}
