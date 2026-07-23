import { definePlugin } from 'nitro'
import { injectDrizzle } from '../utils/drizzle'
import { createPgliteDatabase } from '../utils/pglite-db'

export default definePlugin((nitro) => {
  if (process.env.MOCK_DATABASE && !process.env.VITEST) {
    async function setup() {
      const db = await createPgliteDatabase({
        seed: process.env.MOCK_DATABASE === 'seed',
      })
      injectDrizzle(db)
    }

    const promise = setup()
    nitro.hooks.hook('request', async () => {
      await promise // ensure the database is initialized before handling any requests
    })
  }
})
