import { injectDrizzle } from '#server/utils/drizzle'
import { createPgliteDatabase } from '#server/utils/pglite-db'

// Initialize in-memory PGlite and inject it as the Drizzle database so
// useDrizzle() returns the mock without needing the pglite-e2e plugin's
// request hook to fire (which doesn't reliably trigger under vitest).
// eslint-disable-next-line antfu/no-top-level-await
const db = await createPgliteDatabase({})
injectDrizzle(db)
