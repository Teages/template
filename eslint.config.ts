import antfu from '@antfu/eslint-config'

export default antfu({
  ignores: ['server/database/migrations/**/snapshot.json'],
  gitignore: { recursive: true },
  typescript: {
    tsconfigPath: './tsconfig.json',
    overridesTypeAware: {
      'ts/promise-function-async': 'off',
      'ts/return-await': ['error', 'always'],
      'ts/strict-boolean-expressions': 'off',
      'ts/switch-exhaustiveness-check': 'off',
    },
  },
})
