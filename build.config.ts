import { exec } from 'node:child_process'
import type { BuildEntry } from 'unbuild'
import { defineBuildConfig } from 'unbuild'
import fg from 'fast-glob'
import vue from 'unplugin-vue/rollup'
import dts from 'vite-plugin-dts'

export default defineBuildConfig({
  // stub: true, // using unbuild for dev only
  entries: [
    './src/index.ts',
    ...scan('components'),
  ],
  rollup: { emitCJS: true },

  hooks: {
    'build:before': (ctx) => {
      ctx.options.declaration = ctx.options.stub
    },
    'rollup:options': (_ctx, options) => {
      options.plugins.unshift(
        vue({ isProduction: true }),
      )
    },
    // 'rollup:dts:options': (_ctx, options) => {
    //   options.plugins = options.plugins.filter(
    //     p => p && typeof p === 'object' && 'name' in p && p.name !== 'dts',
    //   )
    //   options.plugins.unshift(dts())
    // },
    'rollup:build': (ctx) => {
      if (!ctx.options.stub) {
        console.log('Generating dts...')
        return new Promise<void>((resolve) => {
          // use vue-tsc to generate dts for production build
          exec('pnpm vue-tsc ./src/index.ts --declaration --emitDeclarationOnly --outDir dist', () => resolve())
        })
      }
    },
  },
})

function scan(dir: string): BuildEntry[] {
  const entries = fg.sync(`src/${dir}/*/index.{ts,tsx,js,jsx,mjs,cjs,cts,mts}`)
    .map(path => ({ input: path, name: path.split('/')[2] }))
    .map((item, index, arr) => {
      const isDuplicate = arr.findIndex(s => s.name === item.name) !== index
      if (isDuplicate) {
        throw new Error(`Duplicate component entry: ${item.name}`)
      }

      return item
    })
    .map(({ input, name }) =>
      <BuildEntry>{ builder: 'rollup', input, outDir: `dist/${dir}/${name}/` },
    )

  const vueFiles = fg.sync(`src/${dir}/**/*.vue`)
    .map(input => <BuildEntry>{ builder: 'rollup', input })

  return [...entries, ...vueFiles]
}
