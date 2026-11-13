import genExportMeta from './codegen/export-meta.ts'
import genIndexExport from './codegen/index-export.ts'

async function main() {
  await genExportMeta()
  await genIndexExport()
}

main()
  .catch(console.error)
