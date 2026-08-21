import { defineConfig } from 'nitro/config'

export default defineConfig({
  serverDir: './server',
  experimental: {
    tasks: true,
    asyncContext: true,
  },
  traceDeps: [
    // Transitive helper that nft misses (see WORKAROUND.md).
    'tslib*',
  ],
})
