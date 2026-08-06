import { builder } from '~/server/graphql/builder'
import { CountEvent } from './CountEvent'
import '~/server/graphql/schema/user/User'

builder.drizzleObjectFields(CountEvent, t => ({
  user: t.relation('user'),
}))
