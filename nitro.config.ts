import { env } from 'node:process'
import { defineConfig } from 'nitro/config'

export default defineConfig({
  serverDir: './server',
  exportConditions: ['module'],
  // Redirects the whole output tree (serverDir/publicDir derive from it).
  // Set by the mock-database smoke build so `.output` keeps the real
  // production flavor (see test/smoke/preview.test.ts).
  output: env.SMOKE_OUTPUT_DIR ? { dir: env.SMOKE_OUTPUT_DIR } : undefined,
  experimental: {
    tasks: true,
    asyncContext: true,
  },
  traceDeps: [
    // Transitive helper that nft misses (see WORKAROUND.md).
    'tslib*',
    // MOCK builds only: externalize + full-trace PGlite so its sidecar
    // assets (pglite.data, extension tarballs, wasm) ship with the package —
    // bundling it into a rollup chunk drops them and crashes at boot.
    ...(env.MOCK_DATABASE ? ['@electric-sql/pglite*'] : []),
  ],
})
