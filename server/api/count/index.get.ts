import { defineHandler } from 'nitro/h3'
import { getCountSnapshot } from '~/server/utils/count-events'
import { useDrizzle } from '~/server/utils/drizzle'
import { useAuthSession } from '~/server/utils/session'

export default defineHandler(async (event) => {
  useAuthSession(event, 'required')
  const { db } = useDrizzle()
  return getCountSnapshot(db)
})
