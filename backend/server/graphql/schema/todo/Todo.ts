import { builder } from '~/server/graphql/builder'

export const Todo = builder.drizzleObject('todos', {
  name: 'Todo',
  fields: t => ({
    id: t.exposeID('id', {}),
    title: t.exposeString('title', {}),
    completed: t.exposeBoolean('completed', {}),
    createdAt: t.expose('createdAt', { type: 'Date' }),
    updatedAt: t.expose('updatedAt', { type: 'Date' }),
  }),
})
