import { defineHandler, setResponseHeader, setResponseStatus } from 'nitro/h3'
import { createCountEvent } from '~/server/rest/count-events'
import { useDrizzle } from '~/server/utils/drizzle'
import { useAuthSession } from '~/server/utils/session'

export default defineHandler(async (event) => {
  const session = useAuthSession(event, 'required')
  const created = await createCountEvent(useDrizzle().db, session.user)
  setResponseStatus(event, 201)
  setResponseHeader(event, 'Location', `/api/count-events/${created.id}`)
  return { data: created }
})
