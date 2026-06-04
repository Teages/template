import { addImportsSources, defineNuxtModule } from 'nuxt/kit'

const importPkgList = [
  'es-toolkit/array',
  'es-toolkit/function',
  'es-toolkit/math',
  'es-toolkit/object',
  'es-toolkit/predicate',
  'es-toolkit/promise',
  'es-toolkit/string',
  'es-toolkit/util',
]

export default defineNuxtModule({
  meta: {
    name: 'es-toolkit',
    configKey: 'esToolkit',
  },
  async setup(_options) {
    for (const pkg of importPkgList) {
      const imports = await listAvaliableImports(pkg)
      addImportsSources({ from: pkg, imports })
    }
  },
})

async function listAvaliableImports(pkg: string) {
  const imports = await import(pkg)
  return Object.keys(imports).filter(key => !key.startsWith('_'))
}
