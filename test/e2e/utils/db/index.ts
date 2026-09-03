import { drizzle } from 'drizzle-orm/pg-proxy'
import * as raw from '../../../../server/database'
import { E2E_BASE_URL } from '../../constants'

const proxyURL = new URL('/_test/db', E2E_BASE_URL)

/**
 * Drizzle client bound to the dev server's in-memory PGlite through the
 * e2e-only proxy handler (test/e2e/db.ts, mounted by the global setup) —
 * same schema as the app. Transactions are not supported (pg-proxy
 * limitation): use per-test unique users for isolation instead.
 */
export function useDrizzle() {
  const { relations, ...schema } = raw

  const db = drizzle(async (sql, params, method) => {
    const response = await fetch(proxyURL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql, params, method }),
    })

    if (!response.ok) {
      throw new Error(`Drizzle proxy failed: ${response.status} ${response.statusText}`)
    }

    return await response.json() as { rows: unknown[] }
  }, { relations })

  return { relations, schema, db }
}
