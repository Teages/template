import { defineHandler, HTTPError } from 'nitro/h3'
import { usePgliteClient } from '~/server/utils/drizzle'
import {
  handleStudioProtocol,
  studioCorsHeaders,
  validateStudioAuthorization,
} from '~/server/utils/drizzle-studio-protocol'

export default defineHandler(async (event) => {
  if (!import.meta.MOCK_DATABASE) {
    throw HTTPError.status(404, 'Not Found')
  }

  const authError = validateStudioAuthorization(
    import.meta.DRIZZLE_STUDIO_KEY,
    event.req.headers.get('authorization'),
  )
  if (authError === 'not-configured') {
    throw HTTPError.status(404, 'Not Found')
  }
  if (authError === 'unauthorized') {
    throw HTTPError.status(401, 'Unauthorized')
  }

  if (event.req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: studioCorsHeaders,
    })
  }

  if (event.req.method !== 'POST') {
    throw HTTPError.status(405, 'Method Not Allowed')
  }

  const body = await event.req.json()
  return handleStudioProtocol(usePgliteClient(), body)
})
