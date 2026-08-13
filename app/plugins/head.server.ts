import { defineVuePlugin } from '~/plugins/vue-ssr/runtime/app/vue-plugin'

export default defineVuePlugin((context) => {
  if (context.environment !== 'server') {
    throw new TypeError('The document head plugin requires a server context')
  }
  context.head.push({
    htmlAttrs: { lang: 'en' },
    title: 'Full-stack API Template',
  })
})
