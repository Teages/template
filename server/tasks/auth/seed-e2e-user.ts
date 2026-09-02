import type { DrizzleDatabase } from '#drizzle'
import { defineTask } from 'nitro/task'
import { useDrizzle } from '#drizzle'
import { createAuthForDatabase } from '#server/utils/auth'

const E2E_TEST_USER = {
  name: 'E2E User',
  email: 'e2e@test.local',
  password: 'password-8-chars',
} as const

export default defineTask({
  meta: {
    name: 'auth:seed-e2e-user',
    description: 'Ensure the fixed Playwright E2E user exists (development only)',
  },
  async run() {
    if (!import.meta.dev) {
      throw new Error('task auth:seed-e2e-user is only allowed in development mode')
    }

    const { db } = useDrizzle()
    await ensureE2eUser(db)

    return { result: { ok: true } }
  },
})

async function ensureE2eUser(db: DrizzleDatabase): Promise<void> {
  const auth = createAuthForDatabase(db)

  const existing = await db.query.users.findFirst({
    where: { email: E2E_TEST_USER.email },
  })
  if (existing)
    return

  await auth.api.signUpEmail({
    body: {
      name: E2E_TEST_USER.name,
      email: E2E_TEST_USER.email,
      password: E2E_TEST_USER.password,
    },
    headers: new Headers({ host: 'localhost' }),
  })
}
