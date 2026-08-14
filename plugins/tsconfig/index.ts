import type { Nitro } from 'nitro/types'
import type { TSConfig } from 'pkg-types'
import type { Plugin } from 'vite'
import type { VueCompilerOptions } from './vue'
import { mkdir } from 'node:fs/promises'
import { isAbsolute, relative, resolve } from 'pathe'
import { writeTSConfig } from 'pkg-types'

export interface TSConfigPaths {
  readonly rootDir: string
  readonly tsconfigDir: string
  readonly buildDir: string
}

export function resolveGeneratedTSConfigDir(rootDir: string): string {
  return resolve(rootDir, '.generated')
}

export function toRelative(from: string, to: string): string {
  const result = relative(from, to)
  if (result === '') {
    return '.'
  }
  if (
    isAbsolute(result)
    || result === '.'
    || result === '..'
    || result.startsWith('./')
    || result.startsWith('../')
  ) {
    return result
  }
  return `./${result}`
}

function pathResolvers({ rootDir, tsconfigDir, buildDir }: TSConfigPaths) {
  return {
    toRoot: (path: string) => toRelative(tsconfigDir, resolve(rootDir, path)),
    toBuild: (path: string) => toRelative(tsconfigDir, resolve(buildDir, path)),
  } as const
}

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
      const tsconfigDir = resolveGeneratedTSConfigDir(rootDir)
      const paths = {
        rootDir,
        tsconfigDir,
        buildDir: nitro.options.buildDir,
      } satisfies TSConfigPaths

      const app = getAppTSConfig(paths)
      const server = getServerTSConfig(paths)
      const node = getNodeTSConfig(paths)

      await nitro.hooks.callHook('prepare:types', { app, server, node })

      await mkdir(tsconfigDir, { recursive: true })
      await Promise.all([
        writeTSConfig(resolve(tsconfigDir, 'tsconfig.app.json'), app),
        writeTSConfig(resolve(tsconfigDir, 'tsconfig.server.json'), server),
        writeTSConfig(resolve(tsconfigDir, 'tsconfig.node.json'), node),
      ])
    },
  }
}

export function getAppTSConfig(paths: TSConfigPaths): TSConfig {
  const { toRoot: pathToRoot, toBuild: pathToBuild } = pathResolvers(paths)

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
      pathToBuild('types/nitro-routes.d.ts'),
      pathToRoot('env.d.ts'),
      pathToRoot('.generated/app/**/*.ts'),
      pathToRoot('.generated/shared/**/*.ts'),
      pathToRoot('app/**/*.ts'),
      pathToRoot('app/**/*.vue'),
      pathToRoot('plugins/*/runtime/app/**/*.ts'),
      pathToRoot('plugins/*/runtime/shared/**/*.ts'),
    ],
  }
}

export function getServerTSConfig(paths: TSConfigPaths): TSConfig {
  const { toRoot: pathToRoot, toBuild: pathToBuild } = pathResolvers(paths)

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
      pathToBuild('types/nitro-config.d.ts'),
      pathToBuild('types/nitro-imports.d.ts'),
      pathToBuild('types/nitro-routes.d.ts'),
      pathToRoot('env.d.ts'),
      pathToRoot('.generated/server/**/*.ts'),
      pathToRoot('.generated/shared/**/*.ts'),
      pathToRoot('server/**/*.ts'),
      pathToRoot('plugins/*/runtime/server/**/*.ts'),
      pathToRoot('plugins/*/runtime/shared/**/*.ts'),
      pathToRoot('test/e2e/app/**/*.ts'),
      pathToRoot('test/e2e/api/**/*.ts'),
      pathToRoot('test/setup.ts'),
      pathToRoot('test/utils.ts'),
    ],
  }
}

export function getNodeTSConfig(paths: TSConfigPaths): TSConfig {
  const { toRoot: pathToRoot, toBuild: pathToBuild } = pathResolvers(paths)

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
      pathToBuild('types/nitro-config.d.ts'),
      pathToRoot('env.d.ts'),
      pathToRoot('test/env.ts'),
      pathToRoot('test/global-setup.ts'),
      pathToRoot('test/unit/**/*.ts'),
      pathToRoot('scripts/**/*.ts'),
      pathToRoot('plugins/**/*.ts'),
      pathToRoot('*.ts'),
    ],
    exclude: [
      pathToRoot('plugins/*/runtime/app/**/*.ts'),
      pathToRoot('plugins/*/runtime/server/**/*.ts'),
      pathToRoot('plugins/*/runtime/shared/**/*.ts'),
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
