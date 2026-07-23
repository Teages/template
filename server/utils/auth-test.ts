import type { TestCookie } from 'better-auth/plugins'
import { useAuth } from './auth'

export interface AuthSessionInput {
  scope?: string
  email?: string
  name?: string
}

export interface AuthSessionResult {
  userId: string
  email: string
  cookies: TestCookie[]
}

function uniqueE2eEmail(scope: string): string {
  return `e2e-${scope}-${crypto.randomUUID()}@test.local`
}

export async function createAuthSession(
  input: AuthSessionInput = {},
): Promise<AuthSessionResult> {
  const auth = useAuth()
  const test = (await auth.$context).test

  const email = input.email ?? uniqueE2eEmail(input.scope ?? crypto.randomUUID())
  const user = test.createUser({
    email,
    name: input.name ?? 'E2E User',
  })
  await test.saveUser(user)

  const cookies = await test.getCookies({
    userId: user.id,
    domain: 'localhost',
  })

  return {
    userId: user.id,
    email,
    cookies,
  }
}
