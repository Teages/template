import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '../../..')

function readRepoFile(relativePath: string): string {
  return readFileSync(resolve(root, relativePath), 'utf8')
}

describe('production compose stack', () => {
  it('gates the app on a completed migrate and a healthy postgres', () => {
    const compose = readRepoFile('compose.yaml')

    expect(compose).toContain('target: migrate')
    expect(compose).toContain('target: runtime')
    expect(compose).toContain('service_healthy')
    expect(compose).toContain('service_completed_successfully')
    expect(compose).toContain('pg_isready')
    expect(compose).not.toMatch(/["']5432:5432["']/)
    expect(compose).not.toContain('MOCK_DATABASE')
  })

  it('runs the traced Nitro server and copies the lockfile into the builder', () => {
    const dockerfile = readRepoFile('Dockerfile')

    expect(dockerfile).toContain('pnpm-lock.yaml')
    expect(dockerfile).toContain('CMD ["node", ".output/server/index.mjs"]')
    expect(dockerfile).not.toContain('MOCK_DATABASE')
  })

  it('keeps local Postgres on 5433 with a volume distinct from production', () => {
    const dev = readRepoFile('compose.dev.yaml')
    const prod = readRepoFile('compose.yaml')

    expect(dev).toContain('5433:5432')
    expect(dev).toContain('postgres_dev_data')
    expect(prod).toContain('postgres_data')
    expect(prod).not.toContain('postgres_dev_data')
  })

  it('publishes Better Auth from APP_ORIGIN instead of the Vite-dev BETTER_AUTH_URL', () => {
    const compose = readRepoFile('compose.yaml')

    expect(compose).toMatch(/\$\{APP_ORIGIN:-http:\/\/localhost:3000\}/)
    expect(compose).not.toMatch(/\$\{BETTER_AUTH_URL/)
    expect(compose).not.toMatch(/\$\{BETTER_AUTH_TRUSTED_ORIGINS/)
  })

  it('does not concatenate a postgres URI in nitro runtimeConfig', () => {
    const nitro = readRepoFile('nitro.config.ts')

    expect(nitro).not.toContain('postgresql://')
    expect(nitro).not.toContain('{{POSTGRES_PASSWORD}}')
  })
})
