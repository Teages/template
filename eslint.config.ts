import antfu from '@antfu/eslint-config'

export default antfu({
  ignores: ['.generated', '.omo', '.agents', 'server/database/migrations/**/snapshot.json'],
  typescript: {
    tsconfigPath: './tsconfig.json',
    overridesTypeAware: {
      'ts/promise-function-async': 'off',
      'ts/return-await': ['error', 'always'],
      'ts/strict-boolean-expressions': 'off',
      'ts/switch-exhaustiveness-check': 'off',
    },
  },
  vue: true,
})
