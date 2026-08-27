import { eq } from 'drizzle-orm'
import { defineHandler, getRouterParam, HTTPError } from 'nitro/h3'
import { useDrizzle } from '#drizzle'
import { countEvents, users } from '~/server/database/schema'
import { useAuthSession } from '~/server/utils/session'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default defineHandler(async (event) => {
  useAuthSession(event, 'required')
  const id = getRouterParam(event, 'id')
  if (!id)
    throw HTTPError.status(400, 'Event id is required')
  if (!UUID_PATTERN.test(id))
    throw HTTPError.status(400, 'Event id must be a UUID')

  const [row] = await useDrizzle().db.select({
    id: countEvents.id,
    userName: users.name,
    userEmail: users.email,
    createdAt: countEvents.createdAt,
  }).from(countEvents).innerJoin(users, eq(countEvents.userId, users.id)).where(eq(countEvents.id, id)).limit(1)

  if (!row)
    throw HTTPError.status(404, 'Count event not found')

  return {
    data: {
      ...row,
      createdAt: row.createdAt.toISOString(),
    },
  }
})
