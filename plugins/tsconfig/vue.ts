export interface VueCompilerOptions {
  // Core
  target?: 'auto' | number
  lib?: string
  typesRoot?: string

  // File handling
  extensions?: string[]
  vitePressExtensions?: string[]
  petiteVueExtensions?: string[]

  // Strictness
  strictTemplates?: boolean
  strictVModel?: boolean
  strictCssModules?: boolean
  checkUnknownProps?: boolean
  checkUnknownEvents?: boolean
  checkUnknownDirectives?: boolean
  checkUnknownComponents?: boolean

  // Type inference
  inferComponentDollarEl?: boolean
  inferComponentDollarRefs?: boolean
  inferTemplateDollarAttrs?: boolean
  inferTemplateDollarEl?: boolean
  inferTemplateDollarRefs?: boolean
  inferTemplateDollarSlots?: boolean

  // Template codegen
  skipTemplateCodegen?: boolean
  vapor?: boolean
  fallthroughAttributes?: boolean
  checkRequiredFallthroughAttributes?: boolean
  fallthroughComponentNames?: string[]
  dataAttributes?: string[]
  htmlAttributes?: string[]
  optionsWrapper?: [string, string] | []

  // Style
  resolveStyleImports?: boolean
  resolveStyleClassNames?: boolean | 'scoped'

  // Language features
  jsxSlots?: boolean

  macros?: Partial<{
    defineProps: string[]
    defineSlots: string[]
    defineEmits: string[]
    defineExpose: string[]
    defineModel: string[]
    defineOptions: string[]
    withDefaults: string[]
  }>

  composables?: Partial<{
    useAttrs: string[]
    useCssModule: string[]
    useSlots: string[]
    useTemplateRef: string[]
  }>

  // Plugins
  plugins?: Array<
    | string
    | {
      name: string
      [key: string]: unknown
    }
  >

  // Experimental
  experimentalModelPropName?: Record<
    string,
    Record<
      string,
      | boolean
      | Record<string, string>
      | Record<string, string>[]
    >
  >
}
