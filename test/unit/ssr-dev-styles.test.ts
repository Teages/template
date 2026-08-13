import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const testDir = dirname(fileURLToPath(import.meta.url))
const entryServerPath = join(
  testDir,
  '../../plugins/vue-ssr/runtime/app/entry-server.ts',
)

describe('ssr stylesheet asset wiring', () => {
  it('merges SSR entry assets so Tailwind CSS is linked during Vite dev', () => {
    // Given: Nitro's ?assets=client omits css in dev; CSS must come from the
    // SSR module graph (see vite-plugin-fullstack / Nitro vite-ssr examples).
    const source = readFileSync(entryServerPath, 'utf8')

    // When / Then: the server entry must import and merge its own ?assets=ssr
    expect(source).toMatch(/\?assets=ssr/)
    expect(source).toMatch(/merge\(\s*serverAssets/)
    expect(source).toContain('/app/pages/**/*.vue')
  })
})
