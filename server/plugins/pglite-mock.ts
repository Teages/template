import { definePlugin } from 'nitro'
import { injectDrizzle } from '../utils/drizzle'
import { createPgliteDatabase } from '../utils/pglite-db'

export default definePlugin((nitro) => {
  if (import.meta.MOCK_DATABASE) {
    async function setup() {
      const { db, client } = await createPgliteDatabase({
        seed: import.meta.MOCK_DATABASE === 'seed',
      })
      injectDrizzle(db, client)
    }

    const promise = setup()
    nitro.hooks.hook('request', async () => {
      await promise
    })
  }
})
