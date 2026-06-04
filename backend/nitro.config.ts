import { defineConfig } from 'nitro'

export default defineConfig({
  serverDir: './server',

  experimental: {
    tasks: true,
    asyncContext: true,
  },

  runtimeConfig: {
    databaseUrl: '',
  },
})
