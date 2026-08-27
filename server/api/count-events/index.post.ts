import { defineHandler } from 'nitro/h3'
import { useDrizzle } from '#drizzle'
import { createCountEvent } from '~/server/rest/count-events'
import { useAuthSession } from '~/server/utils/session'

export default defineHandler(async (event) => {
  const session = useAuthSession(event, 'required')
  const created = await createCountEvent(useDrizzle().db, session.user)
  event.res.status = 201
  event.res.headers.set('Location', `/api/count-events/${created.id}`)
  return { data: created }
})
