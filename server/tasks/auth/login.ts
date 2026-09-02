import type { AuthSessionInput } from '#server/utils/auth-test'
import { defineTask } from 'nitro/task'
import { createAuthSession } from '#server/utils/auth-test'

export default defineTask({
  meta: {
    name: 'auth:login',
    description: 'Create a test user session via Better Auth testUtils (development only)',
  },
  async run(event) {
    if (!import.meta.dev) {
      throw new Error('task auth:login is only allowed in development mode')
    }

    const payload = (event.payload ?? {}) as AuthSessionInput
    const session = await createAuthSession(payload)

    return { result: session }
  },
})
