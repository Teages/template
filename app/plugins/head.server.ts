import { defineVuePlugin } from '~/plugins/vue-ssr/runtime/app/vue-plugin'

export default defineVuePlugin((context) => {
  if (context.environment !== 'server') {
    throw new TypeError('The document head plugin requires a server context')
  }
  // Document-level defaults. Pages override the title via useHead() and it
  // resolves through the template below.
  context.head.push({
    htmlAttrs: { lang: 'en' },
    meta: [
      { charset: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    ],
    titleTemplate: (title?: string) =>
      title ? `${title} · Full-stack API Template` : 'Full-stack API Template',
  })
})
