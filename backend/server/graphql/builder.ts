import type { H3Event } from 'nitro/h3'
import SchemaBuilder from '@pothos/core'
import DrizzlePlugin from '@pothos/plugin-drizzle'
import RelayPlugin from '@pothos/plugin-relay'
import SimpleObjectsPlugin from '@pothos/plugin-simple-objects'
import WithInputPlugin from '@pothos/plugin-with-input'
import { getTableConfig } from 'drizzle-orm/pg-core'
import { relations } from '~/server/database/relations'
import { useDrizzle } from '~/server/utils/drizzle'

export const builder = new SchemaBuilder<{
  Context: { event: H3Event }
  DrizzleRelations: typeof relations
  Scalars: {
    Date: { Input: Date, Output: Date }
    UUID: { Input: string, Output: string }
  }
}>({
  plugins: [DrizzlePlugin, RelayPlugin, SimpleObjectsPlugin, WithInputPlugin],
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

builder.queryType({})
builder.mutationType({})

if (import.meta.dev && import.meta.env.NODE_ENV !== 'test' && !import.meta.env.VITEST) {
  void import('./schema.ts')
}
