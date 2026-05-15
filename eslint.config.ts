import antfu from '@antfu/eslint-config'

export default antfu()
  .override('antfu/markdown/rules', {
    rules: {
      'markdown/no-multiple-h1': 'off',
      'markdown/require-alt-text': 'off',
      'markdown/heading-increment': 'off',
    },
  })
