import { cp } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createResolver, defineNuxtModule, useLogger } from 'nuxt/kit'
import { build } from 'vite'

export interface ModuleOptions {
  /**
   * Force the standalone migrator build on/off. Defaults to production
   * builds only (skipped in dev and test).
   */
  enabled?: boolean
  /** Drizzle migration chain copied next to the bundle. */
  migrationsDir?: string
}

/**
 * Standalone migration bundle: bundles the migration entry into
 * .output/migrate/main.mjs with the SQL migrations copied to
 * .output/migrate/migrations, so a slim node image can run migrations
 * without pnpm or dev dependencies.
 */
export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'migration',
    configKey: 'migration',
  },
  setup(options, nuxt) {
    const logger = useLogger('migration')
    const rootResolver = createResolver(nuxt.options.rootDir)
    const moduleResolver = createResolver(import.meta.url)

    const enabled = options.enabled ?? (!nuxt.options.dev && !nuxt.options.test)
    if (!enabled)
      return

    nuxt.hook('nitro:init', (nitro) => {
      const outDir = resolve(nitro.options.output.dir, 'migrate')

      nuxt.hook('build:done', async () => {
        // Node-targeted lib build: SSR mode keeps node builtins external
        // without browser-compat rewrites, and ssr.noExternal bundles the
        // dependencies into the single-file script (the slim image has no
        // node_modules). The main Nitro build owns .output; only add files.
        await build({
          configFile: false,
          root: nuxt.options.rootDir,
          mode: 'production',
          logLevel: 'warn',
          publicDir: false,
          build: {
            ssr: true,
            outDir,
            emptyOutDir: false,
            lib: {
              entry: moduleResolver.resolve('script.ts'),
              formats: ['es'],
            },
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

        // The slim migrator stage has no source checkout, so the SQL chain
        // travels inside .output alongside main.mjs.
        await cp(
          rootResolver.resolve(options.migrationsDir ?? 'server/database/migrations'),
          resolve(outDir, 'migrations'),
          { recursive: true },
        )

        logger.success(`Standalone migrator written to ${outDir}`)
      })
    })
  },
})
