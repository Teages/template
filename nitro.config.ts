import { defineConfig } from 'nitro/config'

export default defineConfig({
  serverDir: './server',
  exportConditions: ['module'],
  // Rolldown otherwise shares runtime helpers from an app chunk that lib
  // chunks import, which deadlocks ESM evaluation (see WORKAROUND.md).
  inlineDynamicImports: true,
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
  storage: {
    'better-auth:rate-limit': {
      driver: 'memory',
    },
  },
  traceDeps: [
    // Transitive helper that nft misses (see WORKAROUND.md).
    'tslib*',
  ],
})
