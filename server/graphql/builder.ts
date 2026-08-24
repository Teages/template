import type { H3Event } from 'nitro/h3'
import SchemaBuilder from '@pothos/core'
import DrizzlePlugin from '@pothos/plugin-drizzle'
import ErrorsPlugin from '@pothos/plugin-errors'
import RelayPlugin from '@pothos/plugin-relay'
import SimpleObjectsPlugin from '@pothos/plugin-simple-objects'
import WithInputPlugin from '@pothos/plugin-with-input'
import { useDrizzle } from '@teages/nitro-drizzle/runtime'
import { getTableConfig } from 'drizzle-orm/pg-core'
import { relations } from '~/server/database/relations'
import { UnauthorizedError } from '~/server/graphql/errors'

export const builder = new SchemaBuilder<{
  Context: { event: H3Event }
  DefaultFieldNullability: false
  DrizzleRelations: typeof relations
  Scalars: {
    Date: { Input: Date, Output: Date }
    UUID: { Input: string, Output: string }
  }
}>({
  defaultFieldNullability: false,
  // The errors plugin must come first so its field wrapping wraps the
  // drizzle/relay plugins' fields.
  plugins: [ErrorsPlugin, DrizzlePlugin, RelayPlugin, SimpleObjectsPlugin, WithInputPlugin],
  drizzle: {
    client: () => useDrizzle().db,
    getTableConfig,
    relations,
  },
  relay: {},
})

builder.scalarType('Date', {
  serialize: value => value.toISOString(),
  parseValue: (value) => {
    if (typeof value === 'string')
      return new Date(value)
    if (typeof value === 'number')
      return new Date(value)
    throw new Error('Invalid Date')
  },
})

builder.scalarType('UUID', {
  serialize: value => value,
  parseValue: (value) => {
    if (typeof value !== 'string')
      throw new Error('Invalid UUID')
    return value
  },
})

// Shared Error interface so clients can match `... on Error { message }`
// fragments across every error type. Domain errors implement it; unexpected
// errors are NOT part of this contract — Yoga's maskedErrors still hides
// them in production.
const ErrorInterface = builder.interfaceRef<Error>('Error').implement({
  fields: t => ({
    message: t.exposeString('message'),
  }),
})

builder.objectType(UnauthorizedError, {
  name: 'UnauthorizedError',
  interfaces: [ErrorInterface],
})

builder.queryType({})
builder.mutationType({})
