import ui from '@nuxt/ui/vue-plugin'
import { defineVuePlugin } from '~/plugins/vue-ssr/runtime/app/vue-plugin'
import '../assets/css/main.css'

export default defineVuePlugin(({ app }) => {
  app.use(ui)
})
