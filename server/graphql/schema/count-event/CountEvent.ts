import { builder } from '~/server/graphql/builder'

export const CountEvent = builder.drizzleObject('countEvents', {
  name: 'CountEvent',
  fields: t => ({
    id: t.exposeID('id', {}),
    createdAt: t.expose('createdAt', { type: 'Date' }),
  }),
})
