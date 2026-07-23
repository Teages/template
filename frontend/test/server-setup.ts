import { injectDrizzle } from '#server/utils/drizzle'
import { createPgliteDatabase } from '#server/utils/pglite-db'

// eslint-disable-next-line antfu/no-top-level-await
const db = await createPgliteDatabase({})
injectDrizzle(db)
