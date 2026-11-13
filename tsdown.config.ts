import { defineConfig } from 'tsdown'
import { vueSfcPlugin } from 'vue-sfc-transformer/rolldown'

export default defineConfig({
  entry: ['src/**/*.ts', 'src/**/*.css'],
  unbundle: true,
  root: 'src',
  fixedExtension: true,
  hash: false,
  platform: 'node',
  dts: true,
  css: {
    transformer: 'lightningcss',
    // engines.node is not a browser target, so it does not lower CSS.
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
