import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Port file written by `nitroTestPlugin` when it binds a localhost proxy in
 * front of `environments.nitro.dispatchFetch` (env-runner).
 *
 * Tests cannot share `globalThis` or module state with the Vite host process /
 * ModuleRunner split, so document requests bridge over loopback HTTP instead.
 */
export const ENV_RUNNER_PORT_FILE = resolve(
  import.meta.dirname,
  '../../../../.generated/e2e-env-runner-port',
)

export function readEnvRunnerOrigin(): string {
  const port = readFileSync(ENV_RUNNER_PORT_FILE, 'utf8').trim()
  if (!/^\d+$/.test(port)) {
    throw new Error(`Invalid env-runner port in ${ENV_RUNNER_PORT_FILE}: ${port}`)
  }
  return `http://127.0.0.1:${port}`
}

export async function fetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const origin = readEnvRunnerOrigin()
  const url = path.startsWith('http')
    ? path
    : `${origin}${path.startsWith('/') ? path : `/${path}`}`
  return await globalThis.fetch(url, init)
}
