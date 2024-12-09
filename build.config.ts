import fs from 'node:fs/promises'
import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  outDir: 'dist',
  declaration: true,

  entries: [
    {
      builder: 'mkdist',
      input: './src',
      pattern: ['**', '!**/*.vue'],
      format: 'cjs',
      ext: 'cjs',
      loaders: ['js', 'sass', 'postcss'],
    },
    {
      builder: 'mkdist',
      input: './src',
      pattern: ['**', '!**/*.vue'],
      format: 'esm',
      ext: 'mjs',
      loaders: ['js', 'sass', 'postcss'],
    },
    {
      builder: 'mkdist',
      input: './src',
      pattern: ['**/*.vue'],
      loaders: ['js', 'sass', 'postcss', 'vue'],
    },
  ],

  hooks: {
    'mkdist:entry:build': async (_ctx, _entries, { writtenFiles }) => {
      const declarations = writtenFiles.filter(file => file.endsWith('.d.ts'))
      // copy declarations to '.d.mts' and '.d.cts'
      for (const declaration of declarations) {
        const name = declaration.replace(/.d.ts$/, '')
        await fs.copyFile(declaration, `${name}.d.mts`)
        await fs.copyFile(declaration, `${name}.d.cts`)
      }
    },
  },
})
