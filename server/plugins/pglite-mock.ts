import { definePlugin } from 'nitro'
import { prepareDevDrizzle } from '../utils/drizzle/dev'

export default definePlugin((nitro) => {
  if (import.meta.MOCK_DATABASE) {
    const promise = prepareDevDrizzle()
    nitro.hooks.hook('request', async () => {
      await promise
    })
  }
})
