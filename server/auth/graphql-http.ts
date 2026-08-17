import { HTTPError } from 'nitro/h3'
import { isAllowedGraphQLContentType, isTrustedGraphQLOrigin } from '~/server/auth/origin'

export function assertGraphQLHttpRequest(
  request: Request,
  trustedOrigins: readonly string[],
): void {
  if (request.method !== 'POST')
    return
  if (!isAllowedGraphQLContentType(request.headers.get('content-type')))
    throw HTTPError.status(415, 'Unsupported Media Type')
  if (!isTrustedGraphQLOrigin(request.headers.get('origin'), trustedOrigins))
    throw HTTPError.status(403, 'Forbidden')
}
