import { defineEventHandler } from 'nitro/h3'
import { proxyToBackend } from '../utils/proxy'

export default defineEventHandler(event => proxyToBackend(event, { path: '/graphql' }))
