import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, relative, resolve } from 'node:path'

import * as sass from 'sass'
import { glob } from 'tinyglobby'
import { defineConfig } from 'tsdown'
import { vueSfcPlugin } from 'vue-sfc-transformer/rolldown'

async function compileStyles(outDir: string) {
  const files = await glob([
    'src/**/*.scss',
    'src/**/*.sass',
    '!src/**/_*.scss',
    '!src/**/_*.sass',
  ], { onlyFiles: true })

  for (const file of files) {
    const css = sass.compile(file, {
      loadPaths: ['node_modules'],
      syntax: file.endsWith('.sass')
        ? 'indented'
        : 'scss',
    }).css
    const target = resolve(outDir, relative('src', file).replace(/\.s[ac]ss$/, '.css'))
    await mkdir(dirname(target), { recursive: true })
    await writeFile(target, css)
  }
}

export default defineConfig({
  entry: ['src/**/*.ts'],
  unbundle: true,
  root: 'src',
  fixedExtension: true,
  hash: false,
  platform: 'node',
  dts: true,
  plugins: [
    vueSfcPlugin({
      srcDir: 'src',
      tsconfig: 'tsconfig.json',
      emitLegacyDeclarationAlias: true,
      declarationDiagnostics: 'emit',
    }),
  ],
  async onSuccess(config) {
    await compileStyles(config.outDir)
  },
})
