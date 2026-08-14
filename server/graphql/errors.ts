import type { H3Event } from 'nitro/h3'
import type { AuthSession } from '~/server/utils/session'
import { HTTPError } from 'nitro/h3'
import { useAuthSession } from '~/server/utils/session'

/**
 * Domain error surfaced through the schema as typed data (see the errors
 * plugin in builder.ts). Fields that can fail authentication declare this
 * class in their `errors` option; the plugin turns a thrown instance into
 * an `UnauthorizedError` member of the field's Result union instead of a
 * masked GraphQL error.
 */
export class UnauthorizedError extends Error {
  constructor(message = 'Unauthorized') {
    super(message)
    this.name = 'UnauthorizedError'
  }
}

/**
 * Auth guard for GraphQL resolvers: same session cache as the REST/tRPC
 * surfaces, but converts the transport-level 401 into the schema-level
 * {@link UnauthorizedError} so it resolves as data.
 */
export function requireAuthSession(event: H3Event): AuthSession {
  try {
    return useAuthSession(event, 'required')
  }
  catch (error) {
    if (error instanceof HTTPError) {
      throw new UnauthorizedError()
    }
    throw error
  }
}
