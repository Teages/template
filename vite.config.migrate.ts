import type { Plugin } from 'vite'
import { cp } from 'node:fs/promises'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'

const migrationsDir = resolve(import.meta.dirname, 'server/database/migrations')

/**
 * Copies the Drizzle migration chain next to the standalone script. The
 * slim migrate image stage has no source checkout, so the SQL travels inside
 * .output alongside migrate.mjs.
 */
function copyMigrations(): Plugin {
  return {
    name: 'copy-drizzle-migrations',
    closeBundle() {
      return cp(
        migrationsDir,
        resolve(import.meta.dirname, '.output/server/db/migrations'),
        { recursive: true },
      )
    },
  }
}

/**
 * Standalone migration script build: bundles server/scripts/migrate.ts into
 * .output/server/migrate.mjs with the SQL migrations copied to
 * .output/server/db/migrations, so a slim node image can run migrations
 * without pnpm or dev dependencies. Chained after the main build in the
 * `build` script.
 */
export default defineConfig({
  plugins: [copyMigrations()],
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
      },
    },
  },
  ssr: {
    noExternal: true,
  },
})
