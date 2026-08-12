import type { TSConfig } from 'pkg-types'
import type { Plugin } from 'vite'
import { relative } from 'node:path'
import { resolve } from 'pathe'
import { writeTSConfig } from 'pkg-types'

export default function tsconfigPlugin(): Plugin {
  return {
    name: 'internal:tsconfig',
    nitro: {
      setup(nitro) {
        nitro.hooks.hook('build:before', async (nitro) => {
          const rootDir = nitro.options.rootDir
          const buildDir = nitro.options.buildDir
          const pathToRoot = (path: string) => relative(buildDir, resolve(rootDir, path))

          const appConfig: TSConfig = {
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
              pathToRoot('env.d.ts'),
              pathToRoot('.generated/app/**/*.ts'),
              pathToRoot('.generated/shared/**/*.ts'),
              pathToRoot('app/**/*.ts'),
              pathToRoot('app/**/*.vue'),
              pathToRoot('plugins/*/runtime/app/**/*.ts'),
            ],
            vueCompilerOptions: {
              plugins: [
                'vue-router/volar/sfc-route-blocks',
                'vue-router/volar/sfc-typed-router',
              ],
            },
          } as TSConfig

          const nodeConfig: TSConfig = {
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

          const serverConfig: TSConfig = {
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

          await Promise.all([
            writeTSConfig(resolve(buildDir, 'tsconfig.app.json'), appConfig),
            writeTSConfig(resolve(buildDir, 'tsconfig.server.json'), serverConfig),
            writeTSConfig(resolve(buildDir, 'tsconfig.node.json'), nodeConfig),
          ])
        })
      },
    },
  }
}
