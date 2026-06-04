import type { AuthSessionInput } from '~/server/utils/auth-test'
import { defineTask } from 'nitro/task'
import { createAuthSession } from '~/server/utils/auth-test'
import { assertMockDatabase } from '~/server/utils/pglite-db'

export default defineTask({
  meta: {
    name: 'auth:login',
    description: 'Create a test user session via Better Auth testUtils (MOCK_DATABASE only)',
  },
  async run(event) {
    assertMockDatabase('task auth:login')

    const payload = (event.payload ?? {}) as AuthSessionInput
    const session = await createAuthSession(payload)

    return { result: session }
  },
})
