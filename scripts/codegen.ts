import genComponentsMeta from './codegen/components-meta'
import genIndexExport from './codegen/index-export'

async function main() {
  await genComponentsMeta()
  await genIndexExport()
}

main()
  .catch(console.error)
