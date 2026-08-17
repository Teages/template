import { APIError } from 'better-auth'
import {
  BadUserInputError,
  ConflictError,
  InvalidCredentialsError,
} from '~/server/graphql/errors'

const INVALID_CREDENTIAL_CODES = new Set([
  'INVALID_EMAIL_OR_PASSWORD',
  'INVALID_PASSWORD',
  'USER_NOT_FOUND',
])

const CONFLICT_CODES = new Set([
  'USER_ALREADY_EXISTS',
  'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL',
])

const BAD_INPUT_CODES = new Set([
  'INVALID_EMAIL',
  'PASSWORD_TOO_SHORT',
  'PASSWORD_TOO_LONG',
  'VALIDATION_ERROR',
  'MISSING_FIELD',
  'BODY_MUST_BE_AN_OBJECT',
])

export function mapBetterAuthError(error: unknown): never {
  if (!(error instanceof APIError) && !isNamedApiError(error))
    throw error

  const code = readErrorCode(error)
  if (code && INVALID_CREDENTIAL_CODES.has(code))
    throw new InvalidCredentialsError()
  if (code && CONFLICT_CODES.has(code))
    throw new ConflictError()
  if (code && BAD_INPUT_CODES.has(code))
    throw new BadUserInputError()

  const status = readErrorStatus(error)
  if (status === 401)
    throw new InvalidCredentialsError()
  if (status === 409)
    throw new ConflictError()
  if (status === 400 || status === 422)
    throw new BadUserInputError()

  throw new Error('Authentication failed')
}

function isNamedApiError(error: unknown): error is APIError {
  return typeof error === 'object'
    && error !== null
    && 'name' in error
    && error.name === 'APIError'
}

function readErrorCode(error: APIError): string | undefined {
  const body = error.body
  if (typeof body !== 'object' || body === null)
    return undefined
  return typeof body.code === 'string' ? body.code : undefined
}

function readErrorStatus(error: APIError): number | undefined {
  return typeof error.statusCode === 'number' ? error.statusCode : undefined
}
