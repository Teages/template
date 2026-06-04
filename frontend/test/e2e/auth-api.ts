import type { BrowserContext } from '@playwright/test'

const backendURL = 'http://localhost:20398'

export interface AuthTestCookie {
  name: string
  value: string
  domain: string
  path: string
  httpOnly?: boolean
  secure?: boolean
  sameSite?: 'Lax' | 'Strict' | 'None'
  expires?: number
}

export interface AuthSessionResult {
  userId: string
  email: string
  cookies: AuthTestCookie[]
}

interface TaskResponse<T> {
  result: T
}

interface AuthLoginPayload {
  scope?: string
  email?: string
  name?: string
}

async function runBackendTask<T>(name: string, payload?: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${backendURL}/_nitro/tasks/${name}`, {
    method: 'POST',
    headers: payload ? { 'Content-Type': 'application/json' } : undefined,
    body: payload ? JSON.stringify(payload) : undefined,
  })

  if (!response.ok) {
    throw new Error(`Backend task ${name} failed: ${response.status} ${response.statusText}`)
  }

  const data = await response.json() as TaskResponse<T>
  return data.result
}

/** Creates a unique test user and returns Playwright-ready session cookies. */
export async function createAuthSession(payload: AuthLoginPayload = {}): Promise<AuthSessionResult> {
  return runBackendTask<AuthSessionResult>('auth:login', payload as Record<string, unknown>)
}

/** Ensures the fixed E2E user exists for UI sign-in tests. */
export async function seedE2eUser(): Promise<void> {
  await runBackendTask<{ ok: true }>('auth:seed-e2e-user')
}

export async function injectAuthSession(
  context: BrowserContext,
  session: AuthSessionResult,
): Promise<void> {
  await context.addCookies(session.cookies.map(cookie => ({
    name: cookie.name,
    value: cookie.value,
    domain: cookie.domain,
    path: cookie.path,
    httpOnly: cookie.httpOnly,
    secure: cookie.secure,
    sameSite: cookie.sameSite,
    expires: cookie.expires,
  })))
}

type Goto = (path: string, opts?: { waitUntil: 'hydration' }) => Promise<unknown>

/** Injects a test session and navigates home — skips sign-up/sign-in UI. */
export async function signInWithAuthTask(
  context: BrowserContext,
  goto: Goto,
  payload: AuthLoginPayload = {},
): Promise<AuthSessionResult> {
  const session = await createAuthSession(payload)
  await injectAuthSession(context, session)
  await goto('/', { waitUntil: 'hydration' })
  return session
}
