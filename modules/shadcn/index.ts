import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import {
  addComponentExports,
  addComponentsDir,
  createResolver,
  defineNuxtModule,
} from 'nuxt/kit'

export interface ModuleOptions {
  /**
   * Prefix for all the imported components.
   * @default 'Ui'
   */
  prefix: string
  /**
   * Directory that the components live in.
   * Resolved through the Nuxt aliases.
   * @default '@/components/ui'
   */
  componentDir: string
}

/**
 * Registers the shadcn-vue components via their `index.ts` barrel files so the
 * exports (`Button`, `CardHeader`, `buttonVariants`, ...) are auto-imported
 * without Nuxt also scanning every `.vue` file in the directory.
 *
 * @see https://www.shadcn-vue.com/docs/installation/nuxt
 */
export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'shadcn',
    configKey: 'shadcn',
  },
  defaults: {
    prefix: '',
    componentDir: '@/components/ui',
  },
  async setup({ componentDir, prefix }, nuxt) {
    const resolver = createResolver(nuxt.options.rootDir)
    const componentsPath = await resolver.resolvePath(componentDir)

    addComponentsDir({
      path: componentsPath,
      extensions: [],
      ignore: ['**/*'],
    }, { prepend: true })

    try {
      await Promise.all(readdirSync(componentsPath).map(async (dir) => {
        try {
          const filePath = await resolver.resolvePath(join(componentDir, dir, 'index'), {
            extensions: ['.ts', '.js'],
          })
          addComponentExports({
            prefix,
            filePath: resolver.resolve(filePath),
            priority: 1,
          })
        }
        catch (err) {
          if (err instanceof Error)
            console.warn('[shadcn]', err.message)
        }
      }))
    }
    catch (err) {
      if (err instanceof Error)
        console.warn('[shadcn]', err.message)
    }
  },
})
