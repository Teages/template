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
  traceDeps: [
    'better-auth*',
    '@better-auth/*',
    'drizzle-orm*',
    'postgres*',
    'graphql*',
    'graphql-yoga*',
    '@pothos/*',
    'gazania*',
  ],
})
