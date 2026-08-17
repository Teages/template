import { APIError } from 'better-auth'
import { describe, expect, it } from 'vitest'
import { mapBetterAuthError } from '~/server/auth/map-api-error'
import {
  BadUserInputError,
  ConflictError,
  InvalidCredentialsError,
} from '~/server/graphql/errors'

describe('mapBetterAuthError', () => {
  it('maps invalid credentials to InvalidCredentialsError, not UnauthorizedError', () => {
    const error = new APIError('UNAUTHORIZED', {
      message: 'Invalid email or password',
      code: 'INVALID_EMAIL_OR_PASSWORD',
    })

    expect(() => mapBetterAuthError(error)).toThrow(InvalidCredentialsError)
    try {
      mapBetterAuthError(error)
    }
    catch (mapped) {
      expect(mapped).toBeInstanceOf(InvalidCredentialsError)
      expect((mapped as InvalidCredentialsError).message).toBe('Invalid email or password')
    }
  })

  it('maps a duplicate email to ConflictError', () => {
    const error = new APIError('UNPROCESSABLE_ENTITY', {
      message: 'User already exists. Use another email.',
      code: 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL',
    })

    expect(() => mapBetterAuthError(error)).toThrow(ConflictError)
  })

  it('maps password and email validation failures to BadUserInputError', () => {
    expect(() => mapBetterAuthError(new APIError('BAD_REQUEST', {
      message: 'Password too short',
      code: 'PASSWORD_TOO_SHORT',
    }))).toThrow(BadUserInputError)

    expect(() => mapBetterAuthError(new APIError('BAD_REQUEST', {
      message: 'Invalid email',
      code: 'INVALID_EMAIL',
    }))).toThrow(BadUserInputError)
  })

  it('does not leak Better Auth internals for unexpected failures', () => {
    const error = new APIError('INTERNAL_SERVER_ERROR', {
      message: 'Failed to create session',
      code: 'FAILED_TO_CREATE_SESSION',
    })

    try {
      mapBetterAuthError(error)
      expect.unreachable()
    }
    catch (mapped) {
      expect(mapped).toBeInstanceOf(Error)
      expect(mapped).not.toBeInstanceOf(InvalidCredentialsError)
      expect((mapped as Error).message).toBe('Authentication failed')
    }
  })

  it('rethrows unknown errors unchanged', () => {
    const error = new TypeError('boom')
    expect(() => mapBetterAuthError(error)).toThrow(error)
  })
})
