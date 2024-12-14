import genExportMeta from './codegen/export-meta'
import genIndexExport from './codegen/index-export'

async function main() {
  await genExportMeta()
  await genIndexExport()
}

main()
  .catch(console.error)
