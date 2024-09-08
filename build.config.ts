import fs from 'node:fs/promises'

import { vueLoader } from '@teages/mkdist-vue-loader'
import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  outDir: 'dist',
  declaration: true,

  entries: [
    { builder: 'mkdist', input: './src', pattern: ['**', '!**/*.vue'], format: 'cjs', loaders: ['js', 'sass', 'postcss'] },
    { builder: 'mkdist', input: './src', pattern: ['**', '!**/*.vue'], format: 'esm', loaders: ['js', 'sass', 'postcss'] },
    { builder: 'mkdist', input: './src', pattern: ['**/*.vue'], loaders: ['js', 'sass', 'postcss', vueLoader as any] },
  ],

  hooks: {
    'mkdist:entry:build': async (_ctx, _entries, { writtenFiles }) => {
      const vueDts = writtenFiles.filter(file => file.endsWith('.vue.d.ts'))
      // remove things after `declare module 'vue' {}`
      for (const file of vueDts) {
        const content = (await fs.readFile(file, 'utf-8'))
          .replace(/declare module 'vue' \{[\s\S]*/, '')

        await fs.writeFile(file, content)
      }
    },
  },
})
