import process from 'node:process'

const module = process.env.NUXT_PACKAGE_SOURCE === 'dist'
  ? 'package-name/nuxt'
  : '../src/nuxt'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },

  modules: [module],
})
