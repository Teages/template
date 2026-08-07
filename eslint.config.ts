import antfu from '@antfu/eslint-config'

export default antfu({
  ignores: ['.generated', '.omo', '.agents'],
  typescript: {
    tsconfigPath: './tsconfig.json',
    overridesTypeAware: {
      'ts/promise-function-async': 'off',
      'ts/return-await': ['error', 'always'],
      'ts/strict-boolean-expressions': 'off',
      'ts/switch-exhaustiveness-check': 'off',

      // TODO: enable it in the future
      'ts/no-unsafe-assignment': 'off',
      'ts/no-unsafe-member-access': 'off',
      'ts/no-unsafe-return': 'off',
      'ts/no-unsafe-call': 'off',
      'ts/no-unsafe-argument': 'off',
    },
  },
  vue: true,
})
