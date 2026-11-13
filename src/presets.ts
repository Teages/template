import exportMeta from './export-meta.ts'

const packageName = 'package-name'

/**
 * Preset for `unimport` / `unplugin-auto-import`.
 *
 * @example
 * ```ts
 * AutoImport({
 *   imports: [unimportPreset],
 * })
 * ```
 */
export const unimportPreset: UnimportPreset = {
  from: packageName,
  imports: [
    ...Object.keys(exportMeta.composables),
    ...Object.keys(exportMeta.utils),
  ],
}

/**
 * Package preset for `unplugin-auto-import`, which scans the package exports automatically.
 *
 * @example
 * ```ts
 * AutoImport({
 *   packagePresets: [packagePreset],
 * })
 * ```
 */
export const packagePreset: UnimportPackagePreset = {
  package: packageName,
  ignore: Object.keys(exportMeta.components),
}

/**
 * Minimal subset of `unimport`'s `InlinePreset`,
 * so consumers don't need `unimport` installed for types.
 */
export interface UnimportPreset {
  from: string
  imports: string[]
}

/**
 * Minimal subset of `unimport`'s `PackagePreset`.
 */
export interface UnimportPackagePreset {
  package: string
  ignore?: Array<string | RegExp>
}
