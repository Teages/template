import { defineConfig } from 'tsdown'
import { vueSfcPlugin } from 'vue-sfc-transformer/rolldown'

const sourceConfig = defineConfig({
  entry: [
    'src/index.ts',
    'src/{components,composables,styles,utils,styles}/**/*.ts',
  ],
  unbundle: true,
  root: 'src',
  fixedExtension: true,
  platform: 'neutral',
  dts: {
    tsc: { build: true },
  },
  publint: true,
  attw: true,
  css: {
    inject: true,
    transformer: 'lightningcss',
    target: 'baseline-widely-available',
  },
  plugins: [
    vueSfcPlugin({
      srcDir: 'src',
      tsconfig: 'tsconfig.json',
      emitLegacyDeclarationAlias: true,
      declarationDiagnostics: 'emit',
    }),
  ],
})

const intergrationConfig = defineConfig({
  entry: [
    'src/nuxt.ts',
    'src/presets.ts',
    'src/resolvers.ts',
  ],
  root: 'src',
  platform: 'node',
  dts: {
    tsc: { build: true },
  },
  deps: { neverBundle: true },
})

const metaConfig = defineConfig({
  entry: ['src/export-meta.ts'],
  root: 'src',
  platform: 'neutral',
  fixedExtension: true,
  dts: {
    tsc: { build: true },
  },
})

export default defineConfig([
  sourceConfig,
  intergrationConfig,
  metaConfig,
])
