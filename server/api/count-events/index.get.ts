import { defineHandler, getQuery, HTTPError } from 'nitro/h3'
import { decodeCursor, listCountEvents } from '~/server/rest/count-events'
import { useDrizzle } from '~/server/utils/drizzle'
import { isUnknownArray } from '~/server/utils/predicates'
import { useAuthSession } from '~/server/utils/session'

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100

export default defineHandler(async (event) => {
  useAuthSession(event, 'required')
  const query = getQuery(event)
  const rawLimit = isUnknownArray(query.limit) ? query.limit[0] : query.limit
  const limit = rawLimit === undefined ? DEFAULT_LIMIT : Number(rawLimit)
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT)
    throw HTTPError.status(400, `limit must be an integer between 1 and ${MAX_LIMIT}`)

  const rawCursor = isUnknownArray(query.cursor) ? query.cursor[0] : query.cursor
  let cursor
  try {
    cursor = typeof rawCursor === 'string' ? decodeCursor(rawCursor) : undefined
  }
  catch {
    throw HTTPError.status(400, 'cursor is invalid')
  }

  return await listCountEvents(useDrizzle().db, { limit, cursor })
})
