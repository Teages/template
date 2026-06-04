import { defineConfig } from 'nitro'

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
})
