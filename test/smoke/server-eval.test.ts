import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { getRandomPort } from 'get-port-please'
import { describe, expect, it } from 'vitest'

// Locks the production ESM graph: Rolldown helper sharing across Nitro
// `_libs/*` chunks used to throw `TypeError: __exportAll is not a function`
// during module evaluation (see WORKAROUND.md). Needs `.output/server` only,
// not Postgres: better-auth's getSession swallows the connection refusal, so
// /api/health stays 200. `pretest:smoke` builds; invoking vitest directly
// skips when the artifact is missing.

const rootDir = resolve(import.meta.dirname, '../..')
const serverEntry = resolve(rootDir, '.output/server/index.mjs')
const hasBuild = existsSync(serverEntry)
if (!hasBuild) {
  console.warn('[smoke] build output not found — run `pnpm test:smoke` (its pre hook builds); skipping')
}

const run = hasBuild ? describe : describe.skip

run('production server ESM evaluation', () => {
  it('loads the bundled server without circular Rolldown helper initialization', async () => {
    const port = await getRandomPort()
    const child = spawn(process.execPath, [serverEntry], {
      cwd: rootDir,
      env: {
        ...process.env,
        BETTER_AUTH_SECRET: 'smoke-better-auth-secret-32chars',
        BETTER_AUTH_URL: `http://127.0.0.1:${port}`,
        HOST: '127.0.0.1',
        PORT: String(port),
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let logs = ''
    child.stdout?.on('data', (chunk) => {
      logs += chunk
    })
    child.stderr?.on('data', (chunk) => {
      logs += chunk
    })

    try {
      const deadline = Date.now() + 15_000
      for (;;) {
        if (child.exitCode !== null) {
          expect(
            logs,
            `server exited with ${child.exitCode} during ESM evaluation:\n${logs}`,
          ).not.toContain('__exportAll is not a function')
          throw new Error(
            `server exited with ${child.exitCode} during ESM evaluation:\n${logs}`,
          )
        }
        if (Date.now() > deadline) {
          throw new Error(`server did not answer /api/health within 15s:\n${logs}`)
        }
        try {
          const res = await fetch(`http://127.0.0.1:${port}/api/health`)
          if (res.ok) {
            return
          }
        }
        catch {
          // Not up yet — keep polling.
        }
        await delay(100)
      }
    }
    finally {
      if (child.exitCode === null) {
        child.kill('SIGTERM')
        const stopBy = Date.now() + 5_000
        while (child.exitCode === null && Date.now() < stopBy) {
          await delay(50)
        }
        if (child.exitCode === null) {
          child.kill('SIGKILL')
        }
      }
    }
  }, 20_000)
})
