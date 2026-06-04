import type { Plugin } from 'vite'

export function nitroTestPlugin(): Plugin[] {
  const cleanups = new Set<() => Promise<void> | void>()

  return [{
    name: 'nitro:test',
    nitro: {
      setup(nitro) {
        cleanups.add(async () => nitro.close())
      },
    },
    async closeBundle() {
      await Promise.allSettled(Array.from(cleanups, async fn => fn()))
    },
  }]
}
