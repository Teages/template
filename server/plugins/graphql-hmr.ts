import { definePlugin } from 'nitro'

export default definePlugin((_nitroApp) => {
  if (import.meta.dev && import.meta.hot) {
    void import('../graphql/schema.ts')
  }
})
