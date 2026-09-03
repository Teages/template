/// <reference path="../../../../.nuxt/drizzle/schema.d.ts" />
/// <reference path="../../../../.nuxt/drizzle/modules.d.ts" />

import { defineEventHandler, HTTPError, readBody } from 'nitro/h3'
import { useDrizzle } from '#drizzle'

interface DrizzleProxyQuery {
  sql: string
  params: unknown[]
  method: 'all' | 'execute'
}

/**
 * Drizzle proxy endpoint for the e2e suite (client: test/e2e/utils/db).
 * Only mounted by the e2e global setup via its `nitro.handlers` override —
 * `pnpm dev` and production builds never register this route. Executes raw
 * parameterized queries against the same in-memory PGlite the app runs on,
 * so tests can seed and verify database state without touching server code.
 */
export default defineEventHandler(async (event) => {
  const body = await readBody<DrizzleProxyQuery>(event)
  if (typeof body?.sql !== 'string' || !Array.isArray(body.params)) {
    throw HTTPError.status(400)
  }

  const { db } = useDrizzle()
  const client = db.$client as unknown as import('@electric-sql/pglite').PGlite
  const { rows } = await client.query(body.sql, body.params, {
    // `all` is drizzle's arrays mode — rows must come back as positional arrays
    rowMode: body.method === 'all' ? 'array' : 'object',
  })

  return { rows }
})
