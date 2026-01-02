// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: 'latest',

  css: ['~/assets/css/main.css'],

  modules: ['@nuxt/eslint', '@nuxt/ui', '@vueuse/nuxt'],

  devtools: { enabled: true },

  eslint: {
    config: { standalone: false },
  },

  icon: {
    provider: 'iconify',
  },
})
