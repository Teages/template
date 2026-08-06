import { teardownNitroInstances } from './plugin.ts'

/**
 * Global setup for the whole Vitest workspace.
 *
 * Runs on the core workspace project, so its teardown is invoked on every
 * shutdown — including filtered runs (`--project unit`) where the `api`/`e2e`
 * projects are resolved (spawning Nitro) but not executed. The teardown closes
 * every Nitro instance collected by `nitroTestPlugin`, releasing the env-runner
 * workers and file watchers that would otherwise keep the process alive and
 * trigger `close timed out after 10000ms`.
 */
export function setup() {
  return async function teardown() {
    await teardownNitroInstances()
  }
}
