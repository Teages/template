import { defineRelations } from 'drizzle-orm'
import { authRelations } from './auth'
import * as schema from './schema'

export const relations = {
  ...defineRelations(schema, r => ({
    countEvents: {
      user: r.one.users({
        from: r.countEvents.userId,
        to: r.users.id,
      }),
    },
  })),
  ...authRelations,
}
