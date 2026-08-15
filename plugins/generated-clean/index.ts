import type { Plugin } from 'vite'
import { mkdir, readdir, rm } from 'node:fs/promises'
import { cwd } from 'node:process'
import { basename, join, resolve } from 'pathe'
import { ENV_RUNNER_PORT_FILE } from '../nitro-test/runtime/node/env-runner-bridge.ts'

/**
 * Entries that outlive a `.generated` rebuild: the e2e env-runner port file
 * is runtime state written by `nitro:test` (not a generated artifact), and
 * `*.tsbuildinfo` are vue-tsc incremental caches — dropping them would turn
 * every typecheck into a cold run. The port file is matched by basename so
 * the rule keeps working for any rootDir (tests) while following the
 * nitro-test constant.
 */
function isPreservedGeneratedEntry(entryPath: string): boolean {
  return (
    basename(entryPath) === basename(ENV_RUNNER_PORT_FILE)
    || entryPath.endsWith('.tsbuildinfo')
  )
}

/**
 * Empty `.generated` so every rebuild starts from a clean slate — stale
 * artifacts from removed pages, plugins, or past misconfigurations must not
 * survive (Nuxt does the same for its build dir).
 */
export async function clearGeneratedDir(rootDir: string): Promise<void> {
  const generatedDir = resolve(rootDir, '.generated')
  await mkdir(generatedDir, { recursive: true })
  const entries = await readdir(generatedDir)
  await Promise.all(
    entries
      .map(entry => join(generatedDir, entry))
      .filter(entryPath => !isPreservedGeneratedEntry(entryPath))
      .map(entryPath => rm(entryPath, { recursive: true, force: true })),
  )
}

/**
 * Clears `.generated` before anything writes into it. Registered inline (and
 * only) by `scripts/prepare.ts`: the `config` hook completes before any
 * plugin's `configResolved`/`buildStart`/transform, so no dts writer can
 * race the clear. It must NOT be registered for dev, build, or vitest —
 * builds never rewrite the unplugin dts files (hollowing `.generated` out
 * for the next lint), and clearing during vite config resolution breaks
 * filtered vitest runs that resolve this config without executing it.
 */
export function generatedCleanPlugin(): Plugin {
  return {
    name: 'internal:generated-clean',
    async config(userConfig) {
      await clearGeneratedDir(userConfig.root ?? cwd())
    },
  }
}
