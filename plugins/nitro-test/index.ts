import type { Plugin } from 'vite'

interface NitroInstance {
  close: () => Promise<void>
}

interface NitroTestGlobal {
  __nitroInstances__?: Set<NitroInstance>
}

/** Close every registered Nitro instance. Safe to call multiple times. */
export async function teardownNitroInstances(): Promise<void> {
  const instances = (globalThis as unknown as NitroTestGlobal).__nitroInstances__
  if (instances?.size) {
    const pending = [...instances].map(nitro => nitro.close())
    instances.clear()
    await Promise.allSettled(pending)
  }
}

/**
 * Collects every Nitro instance spawned by Vitest's inline Vite environments
 * so `test/global-setup.ts` can close them — the env-runner workers and file
 * watchers would otherwise keep the process alive and trigger
 * `close timed out after 10000ms`.
 */
export function nitroTestPlugin(): Plugin[] {
  return [{
    name: 'nitro:test',
    nitro: {
      setup(nitro) {
        const g = globalThis as unknown as NitroTestGlobal
        ;(g.__nitroInstances__ ??= new Set()).add(nitro)
      },
    },
  }]
}
