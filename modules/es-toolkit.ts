import { addImportsSources, defineNuxtModule } from 'nuxt/kit'

const importPkgList = [
  'es-toolkit/promise',
  'es-toolkit/array',
  'es-toolkit/function',
  'es-toolkit/math',
  'es-toolkit/object',
  'es-toolkit/predicate',
  'es-toolkit/string',
  'es-toolkit/util',
]

export default defineNuxtModule({
  meta: {
    name: 'es-toolkit',
    configKey: 'esToolkit',
  },
  async setup(_options) {
    const seen = new Set<string>()
    for (const pkg of importPkgList) {
      const imports = await listAvaliableImports(pkg, seen)
      addImportsSources({ from: pkg, imports })
    }
  },
})

async function listAvaliableImports(pkg: string, seen: Set<string>) {
  const imports = await import(pkg)
  const names = Object.keys(imports).filter(key => !key.startsWith('_') && !seen.has(key))
  for (const name of names)
    seen.add(name)
  return names
}
