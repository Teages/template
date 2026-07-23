import type { H3Event } from 'nitro/h3'
import { defineEventHandler } from 'nitro/h3'
import { loadAuthSession } from '../utils/session'

export default defineEventHandler(async (event: H3Event) => {
  await loadAuthSession(event)
})
