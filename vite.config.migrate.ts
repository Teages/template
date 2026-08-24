import { resolve } from 'node:path'
import { defineConfig } from 'vite'

/**
 * Standalone migration script build: bundles server/scripts/migrate.ts into
 * .output/server/migrate.mjs. The SQL migrations are already copied to
 * .output/server/db/migrations by @teages/nitro-drizzle during the main
 * build, so a slim node image can run migrations without pnpm or dev
 * dependencies. Chained after the main build in the `build` script.
 */
export default defineConfig({
  build: {
    // Node-targeted lib build: SSR mode keeps node builtins external without
    // browser-compat rewrites, and ssr.noExternal bundles the dependencies
    // into the single-file script (the slim image has no node_modules).
    ssr: true,
    lib: {
      entry: resolve(import.meta.dirname, 'server/scripts/migrate.ts'),
      formats: ['es'],
    },
    outDir: '.output/server',
    // The main Nitro build owns .output; only add files to it.
    emptyOutDir: false,
    rollupOptions: {
      output: {
        entryFileNames: 'migrate.mjs',
        inlineDynamicImports: true,
      },
    },
  },
  ssr: {
    noExternal: true,
  },
})
