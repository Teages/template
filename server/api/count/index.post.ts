import { defineHandler } from 'nitro/h3'
import { recordCountEvent } from '~/server/utils/count-events'
import { useDrizzle } from '~/server/utils/drizzle'
import { useAuthSession } from '~/server/utils/session'

export default defineHandler(async (event) => {
  const session = useAuthSession(event, 'required')
  const { db } = useDrizzle()
  return recordCountEvent(db, session.user.id)
})
