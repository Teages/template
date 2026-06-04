import { defineRelations } from 'drizzle-orm'
import { relations as authRelations } from './auth'
import * as schema from './schema'

export const relations = {
  ...defineRelations(schema, r => ({
    todos: {
      user: r.one.users({
        from: r.todos.userId,
        to: r.users.id,
      }),
    },
  })),
  ...authRelations,
}
