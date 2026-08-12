import { defineConfig } from 'nitro/config'

export default defineConfig({
  serverDir: './server',
  exportConditions: ['module'],
  experimental: {
    tasks: true,
    asyncContext: true,
  },
  runtimeConfig: {
    databaseUrl: '',
  },
  traceDeps: ['tslib*'],
})
