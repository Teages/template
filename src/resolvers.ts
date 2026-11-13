import exportMeta from './export-meta.ts'

const packageName = 'package-name'

export interface ComponentResolverOptions {
  /**
   * Prefix of the component names.
   *
   * @default 'P'
   */
  prefix?: string
  /**
   * Import the styles together with the component.
   *
   * @default true
   */
  importStyle?: boolean
}

export interface ComponentResolveResult {
  name: string
  from: string
  sideEffects?: string
}

/**
 * Resolver for `unplugin-vue-components`.
 *
 * @example
 * ```ts
 * Components({
 *   resolvers: [componentResolver()],
 * })
 * ```
 */
export function componentResolver(
  options: ComponentResolverOptions = {},
): (componentName: string) => ComponentResolveResult | undefined {
  const {
    prefix = 'P',
    importStyle = true,
  } = options

  const componentNames = new Set(Object.keys(exportMeta.components))

  return (componentName: string) => {
    if (!componentName.startsWith(prefix)) {
      return
    }

    const name = componentName.slice(prefix.length)

    if (!componentNames.has(name)) {
      return
    }

    return {
      name,
      from: packageName,
      ...(importStyle
        ? { sideEffects: `${packageName}/styles` }
        : {}),
    }
  }
}
