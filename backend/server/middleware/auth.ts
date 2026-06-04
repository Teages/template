import { defineHandler } from 'nitro'
import { loadAuthSession } from '../utils/session'

export default defineHandler(async (event) => {
  await loadAuthSession(event)
})
