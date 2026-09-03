import antfu from '@antfu/eslint-config'
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(antfu({
  gitignore: { recursive: true },
  typescript: {
    tsconfigPath: './tsconfig.json',
    ignoresTypeAware: [
      '**\/*.md\/**',
      '**/test/**/*.{test,spec}.ts',
    ],
    overridesTypeAware: {
      'ts/promise-function-async': 'off',
      'ts/return-await': ['error', 'always'],
      'ts/strict-boolean-expressions': 'off',
      'ts/switch-exhaustiveness-check': 'off',
    },
  },
}))
