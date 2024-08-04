import antfu from '@antfu/eslint-config'

export default antfu({
  ignores: [
    '__generated__',
    'node_modules',
    'coverage',
    'dist',
  ],
  rules: {
    curly: ['error', 'all'],
  },
})
