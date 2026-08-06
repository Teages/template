import { defineHandler } from 'nitro/h3'
import { loadAuthSession } from '../utils/session'

export default defineHandler(async (event) => {
  await loadAuthSession(event)
})
