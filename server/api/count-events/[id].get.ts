import { eq } from 'drizzle-orm'
import { defineHandler, getRouterParam, HTTPError } from 'nitro/h3'
import { countEvents, users } from '~/server/database/schema'
import { useDrizzle } from '~/server/utils/drizzle'
import { useAuthSession } from '~/server/utils/session'

export default defineHandler(async (event) => {
  useAuthSession(event, 'required')
  const id = getRouterParam(event, 'id')
  if (!id)
    throw HTTPError.status(400, 'Event id is required')

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
