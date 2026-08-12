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
    '@trpc/*',
    'zod*',
    // tslib is a transitive dep of graphql-yoga / @whatwg-node/* (emitted by
    // tsc's CJS helpers). Nitro's nft trace copies those packages into
    // .output/server/node_modules but misses tslib, causing
    // "Cannot find module '.../node_modules/tslib/tslib.js'" at runtime.
    'tslib*',
  ],
})
