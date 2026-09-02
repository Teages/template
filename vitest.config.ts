import { argv } from 'node:process'
import { defineConfig } from 'vitest/config'
import { api } from './test/projects/api.ts'
import { nuxt } from './test/projects/nuxt.ts'
import { unit } from './test/projects/unit.ts'

const rootDir = import.meta.dirname

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      exclude: ['**/node_modules/**', '**/.nuxt/**', 'test/**'],
    },
    projects: [
      // The api project spawns Nitro while its config is derived, so it is
      // only evaluated when actually selected; everything else is cheap.
      ...isProjectSelected('api') ? [api(rootDir)] : [],
      nuxt(rootDir),
      unit(rootDir),
    ],
  },
})

function isProjectSelected(name?: string) {
  const isSelectedProject = argv.some(arg => arg.includes('--project'))
  if (!isSelectedProject) {
    return true
  }

  const isSelectedApiViaEq = argv.includes(`--project=${name}`)
  if (isSelectedApiViaEq) {
    return true
  }

  const isSelectedApiViaSpace = argv.some(
    (arg, index) => arg === '--project' && argv[index + 1] === name,
  )
  if (isSelectedApiViaSpace) {
    return true
  }

  return false
}
