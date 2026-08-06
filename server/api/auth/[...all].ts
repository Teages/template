import { defineHandler } from 'nitro/h3'
import { useAuth } from '~/server/utils/auth'

export default defineHandler(event => useAuth().handler(event.req))
