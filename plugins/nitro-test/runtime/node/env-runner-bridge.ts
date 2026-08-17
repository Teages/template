import { envRunnerOrigin } from 'virtual:nitro-test/env-runner-origin'

/**
 * HTTP client for the e2e document tests. `nitroTestPlugin` binds a loopback
 * proxy in front of `environments.nitro.dispatchFetch` (env-runner) and
 * injects its origin via the `virtual:nitro-test/env-runner-origin` module.
 *
 * Tests cannot share `globalThis` or module state with the Vite host process /
 * ModuleRunner split, so document requests bridge over loopback HTTP instead.
 * This module must only be imported through the e2e Vite pipeline — it is the
 * only project that registers `nitroTestPlugin` to resolve the virtual import.
 */
export async function fetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const url = path.startsWith('http')
    ? path
    : `${envRunnerOrigin}${path.startsWith('/') ? path : `/${path}`}`
  return await globalThis.fetch(url, init)
}
