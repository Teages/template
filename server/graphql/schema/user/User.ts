import { builder } from '~/server/graphql/builder'

export const User = builder.drizzleObject('users', {
  name: 'User',
  fields: t => ({
    id: t.exposeID('id', {}),
    name: t.exposeString('name', {}),
    email: t.exposeString('email', {}),
  }),
})
