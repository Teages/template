import type { ChildProcess } from 'node:child_process'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { getRandomPort } from 'get-port-please'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

// Smoke for the bundled production output — the surface `pnpm test` never
// touches: its suites run Nitro in-process through the dev pipeline, while
// bundling regressions (nft trace misses — see the tslib entry in
// WORKAROUND.md) only appear when `.output/server` runs for real. Both modes
// boot the server the way the Docker runtime does
// (`node .output/server/index.mjs` — the same server `pnpm preview` wraps):
//
// - `pglite` (default, `pnpm test:smoke`): a MOCK_DATABASE flavor built into
//   `.output-smoke` by the `pretest:smoke` hook — no Postgres or Docker
//   needed. The artifact requires the repo's node_modules for drizzle-kit
//   (see applySchema in server/utils/pglite-db.ts), so it must run from
//   within the repository.
// - `postgres` (`pnpm test:smoke:postgres`, used in CI): the real `pnpm
//   build` output (rebuilt by `pretest:smoke:postgres`) against a real
//   Postgres (compose.dev.yaml on 5433 matches the readPostgresConnection()
//   defaults; export POSTGRES_* to override) and additionally verifies the
//   standalone migrate bundle.
//
// Both pre hooks force a fresh build, so the suite always tests the current
// sources. Invoking vitest directly (no pre hook) skips when the artifact is
// missing — run through the pnpm scripts instead.

type SmokeDatabase = 'pglite' | 'postgres'

const database: SmokeDatabase
  = process.env.SMOKE_DATABASE === 'postgres' ? 'postgres' : 'pglite'
const realDb = database === 'postgres'

const rootDir = resolve(import.meta.dirname, '../..')
const outputDir = resolve(rootDir, realDb ? '.output' : '.output-smoke')
const serverEntry = resolve(outputDir, 'server/index.mjs')
const migrateEntry = resolve(rootDir, '.output/server/migrate.mjs')

const hasBuild = existsSync(serverEntry) && (!realDb || existsSync(migrateEntry))
if (!hasBuild) {
  console.warn('[smoke] build output not found — run `pnpm test:smoke` / `pnpm test:smoke:postgres` (their pre hooks build); skipping')
}

const SIGN_UP_MUTATION = /* GraphQL */ `
  mutation SmokeSignUp($input: SignUpEmailInput!) {
    signUpEmail(input: $input) {
      __typename
      ... on SignUpEmailPayload {
        user { email }
      }
      ... on ConflictError { message }
      ... on BadUserInputError { message }
      ... on RateLimitedError { message }
    }
  }
`

const RECORD_COUNT_MUTATION = /* GraphQL */ `
  mutation SmokeRecordCount {
    recordCount {
      __typename
      ... on RecordCountPayload {
        totalCount
        countEvent { id }
      }
      ... on UnauthorizedError {
        message
      }
    }
  }
`

interface RecordCountBody {
  errors?: Array<{ message: string }>
  data?: {
    recordCount:
      | { __typename: 'RecordCountPayload', totalCount: number, countEvent: { id: string } }
      | { __typename: 'UnauthorizedError', message: string }
  }
}

const run = hasBuild ? describe : describe.skip

run(`production build smoke (${database})`, () => {
  let baseUrl: string
  let sessionCookie: string
  let server: ChildProcess | undefined
  let serverLogs = ''

  interface ChildRun {
    code: number | null
    output: string
  }

  function runNode(script: string, env: NodeJS.ProcessEnv): Promise<ChildRun> {
    return new Promise((resolveRun) => {
      const child = spawn(process.execPath, [script], {
        cwd: rootDir,
        env: {
          ...process.env,
          BETTER_AUTH_SECRET: 'smoke-better-auth-secret-32chars',
          ...env,
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      })
      let output = ''
      child.stdout.on('data', (chunk) => {
        output += chunk
      })
      child.stderr.on('data', (chunk) => {
        output += chunk
      })
      child.once('exit', code => resolveRun({ code, output }))
    })
  }

  async function signUp(): Promise<string> {
    const email = `smoke-${crypto.randomUUID()}@test.local`
    const res = await fetch(`${baseUrl}/api/graphql`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'origin': baseUrl },
      body: JSON.stringify({
        query: SIGN_UP_MUTATION,
        variables: {
          input: {
            email,
            name: 'Smoke User',
            password: 'password-8-chars',
          },
        },
      }),
    })
    expect(res.status, `sign-up failed:\n${serverLogs}`).toBe(200)
    const body = await res.json() as {
      errors?: Array<{ message: string }>
      data?: { signUpEmail: { __typename: string } }
    }
    expect(body.errors, `sign-up GraphQL errors:\n${JSON.stringify(body)}\n${serverLogs}`).toBeUndefined()
    expect(body.data?.signUpEmail.__typename).toBe('SignUpEmailPayload')
    const cookie = res.headers.getSetCookie()
      .map(entry => entry.split(';')[0]!)
      .join('; ')
    expect(cookie.length).toBeGreaterThan(0)
    return cookie
  }

  async function graphqlRecordCount(cookie?: string): Promise<RecordCountBody> {
    const res = await fetch(`${baseUrl}/api/graphql`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'origin': baseUrl,
        ...(cookie ? { cookie } : {}),
      },
      body: JSON.stringify({ query: RECORD_COUNT_MUTATION }),
    })
    expect(res.status, `GraphQL request failed:\n${serverLogs}`).toBe(200)
    return await res.json() as RecordCountBody
  }

  beforeAll(async () => {
    if (realDb) {
      // The standalone migrate bundle runs twice on purpose: it must stay
      // idempotent, since the compose migrate job may re-run after crashes.
      for (const attempt of [1, 2]) {
        const result = await runNode(migrateEntry, {})
        if (result.code !== 0) {
          throw new Error(
            `migrate #${attempt} exited with ${result.code}:\n${result.output}`
            + '\nHint: is Postgres reachable on localhost:5433?'
            + ' (docker compose -f compose.dev.yaml up -d)',
          )
        }
      }
    }

    const port = await getRandomPort()
    baseUrl = `http://127.0.0.1:${port}`
    server = spawn(process.execPath, [serverEntry], {
      cwd: rootDir,
      env: {
        ...process.env,
        BETTER_AUTH_SECRET: 'smoke-better-auth-secret-32chars',
        BETTER_AUTH_URL: baseUrl,
        HOST: '127.0.0.1',
        PORT: String(port),
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    server.stdout?.on('data', (chunk) => {
      serverLogs += chunk
    })
    server.stderr?.on('data', (chunk) => {
      serverLogs += chunk
    })

    const deadline = Date.now() + 30_000
    for (;;) {
      if (server.exitCode !== null) {
        throw new Error(`server exited with ${server.exitCode} during startup:\n${serverLogs}`)
      }
      if (Date.now() > deadline) {
        throw new Error(`server did not answer /api/health within 30s:\n${serverLogs}`)
      }
      try {
        const res = await fetch(`${baseUrl}/api/health`)
        if (res.ok) {
          break
        }
      }
      catch {
        // Not up yet — keep polling.
      }
      await delay(250)
    }

    sessionCookie = await signUp()
  }, 120_000)

  afterAll(async () => {
    if (!server || server.exitCode !== null) {
      return
    }
    server.kill('SIGTERM')
    const deadline = Date.now() + 10_000
    while (server.exitCode === null && Date.now() < deadline) {
      await delay(100)
    }
    if (server.exitCode === null) {
      server.kill('SIGKILL')
    }
  })

  it('does not expose Better Auth HTTP routes', async () => {
    const res = await fetch(`${baseUrl}/api/auth/sign-up/email`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'origin': baseUrl },
      body: JSON.stringify({
        email: `smoke-${crypto.randomUUID()}@test.local`,
        name: 'Smoke User',
        password: 'password-8-chars',
      }),
    })
    expect(res.status).toBe(404)
  })

  it('answers /api/health', async () => {
    const res = await fetch(`${baseUrl}/api/health`)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
  })

  it('answers routes outside /api with a 404 (API-only server)', async () => {
    const res = await fetch(`${baseUrl}/`, {
      headers: { accept: 'text/html', cookie: sessionCookie },
    })
    expect(res.status).toBe(404)
  })

  it('resolves unauthenticated GraphQL mutations as UnauthorizedError data', async () => {
    const body = await graphqlRecordCount()
    expect(body.errors).toBeUndefined()
    const result = body.data?.recordCount
    if (result?.__typename !== 'UnauthorizedError') {
      throw new Error(`expected UnauthorizedError data, got: ${JSON.stringify(result)}`)
    }
    expect(result.message).toBeTruthy()
  })

  it('records a count event over the GraphQL mutation', async () => {
    const body = await graphqlRecordCount(sessionCookie)
    expect(body.errors).toBeUndefined()
    const result = body.data?.recordCount
    if (result?.__typename !== 'RecordCountPayload') {
      throw new Error(`expected RecordCountPayload, got: ${JSON.stringify(result)}\n${serverLogs}`)
    }
    expect(result.totalCount).toBeGreaterThanOrEqual(1)
    expect(result.countEvent.id).toBeTruthy()
  })
})
