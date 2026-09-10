import type { ResultOf, TypedDocumentNode, VariablesOf } from 'gazania'
import { createClient } from '@teages/oh-my-graphql'
import { serverFetch } from 'nitro/app'
import { createFetch } from 'ofetch'

export async function createTestUser() {
  const auth = useAuth()

  const name = `user${crypto.randomUUID()}`
  const email = `${name}@test.local`
  const password = crypto.randomUUID()

  const basicInfo = { name, email, password }

  const { headers, response } = await auth.api.signUpEmail({
    body: basicInfo,
    returnHeaders: true,
  })

  const cookie = headers
    .getSetCookie()
    .map(setCookie => setCookie.slice(0, setCookie.indexOf(';')))
    .join('; ')

  const api = <TDocument extends TypedDocumentNode<any, any>>(
    document: TDocument,
    variables: VariablesOf<TDocument>,
    options?: {
      headers?: Record<string, string>
    },
  ): Promise<ResultOf<TDocument>> => {
    const client = createClient('/api/graphql', { ofetch: createFetch({ fetch: serverFetch }) })

    return client.request(document, variables, {
      preferQueryMethod: 'GET',
      headers: {
        cookie,
        ...options?.headers,
      },
    })
  }

  return {
    userId: response.user.id,
    basicInfo,
    api,
  }
}
