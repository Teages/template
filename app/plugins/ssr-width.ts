import { provideSSRWidth } from '@vueuse/core'
import { defineNuxtPlugin } from '#app'

/**
 * shadcn-vue components that rely on `useSSRWidth` (e.g. responsive
 * sidebars) need a stable SSR breakpoint to avoid hydration mismatches.
 *
 * @see https://www.shadcn-vue.com/docs/installation/nuxt
 */
export default defineNuxtPlugin((nuxtApp) => {
  provideSSRWidth(1024, nuxtApp.vueApp)
})
