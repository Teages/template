import { defineConfig } from 'nitro/config'

export default defineConfig({
  serverDir: './server',
  experimental: {
    tasks: true,
    asyncContext: true,
  },
  runtimeConfig: {
    postgres: {
      host: 'localhost',
      port: 5433,
      user: 'user',
      password: 'passwd',
      db: 'mydb',
    },
  },
  traceDeps: [
    // Transitive helper that nft misses (see WORKAROUND.md).
    'tslib*',
  ],
})
