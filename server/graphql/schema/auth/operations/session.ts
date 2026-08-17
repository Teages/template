import { loadUserRow } from '~/server/auth/operations'
import { builder } from '~/server/graphql/builder'
import { useAuthSession } from '~/server/utils/session'
import { Session } from '../Session'

builder.queryFields(t => ({
  session: t.field({
    type: Session,
    nullable: true,
    resolve: async (_root, _args, { event }) => {
      const authSession = useAuthSession(event, 'optional')
      if (!authSession)
        return null
      return { user: await loadUserRow(authSession.user.id) }
    },
  }),
}))
