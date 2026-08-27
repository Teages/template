import type { Plugin } from 'vite'
import { cp } from 'node:fs/promises'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'

/**
 * Standalone migration script build: bundles scripts/migrate.ts into
 * .output/migrate/main.mjs with the SQL migrations copied to
 * .output/migrate/migrations, so a slim node image can run migrations
 * without pnpm or dev dependencies. Chained after the main build in the
 * `build` script.
 */
export default defineConfig({
  plugins: [
    copyMigrations({
      from: resolve(import.meta.dirname, 'server/database/migrations'),
      to: resolve(import.meta.dirname, '.output/migrate/migrations'),
    }),
  ],
  build: {
    // Node-targeted lib build: SSR mode keeps node builtins external without
    // browser-compat rewrites, and ssr.noExternal bundles the dependencies
    // into the single-file script (the slim image has no node_modules).
    ssr: true,
    lib: {
      entry: resolve(import.meta.dirname, 'scripts/migrate.ts'),
      formats: ['es'],
    },
    outDir: '.output/migrate',
    // The main Nitro build owns .output; only add files to it.
    emptyOutDir: false,
    rolldownOptions: {
      output: {
        entryFileNames: 'main.mjs',
      },
    },
  },
  ssr: {
    noExternal: true,
  },
})

/**
 * Copies the Drizzle migration chain next to the standalone script. The
 * slim migrate image stage has no source checkout, so the SQL travels inside
 * .output alongside main.mjs.
 */
function copyMigrations(options: { from: string, to: string }): Plugin {
  return {
    name: 'copy-drizzle-migrations',
    closeBundle() {
      return cp(options.from, options.to, { recursive: true })
    },
  }
}
