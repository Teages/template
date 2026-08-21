import type { DrizzleDatabase } from '~/server/utils/drizzle/shared'
import { describe, expect, it, vi } from 'vitest'
import { countEvents, users } from '~/server/database/schema'
import { initDevDrizzle, prepareDevDrizzle, resetDatabase } from '~/server/utils/drizzle/dev'
import { assertExplicitPostgresConfig } from '~/server/utils/drizzle/prod'

const userId = 'drizzle-dev-test-user'

async function seedRow(db: DrizzleDatabase): Promise<void> {
  await db.insert(users).values({
    id: userId,
    name: 'Drizzle Dev Test',
    email: 'drizzle.dev.test@example.com',
  })
  await db.insert(countEvents).values({ userId })
}

describe('assertExplicitPostgresConfig', () => {
  it('passes in dev without any NITRO_POSTGRES_* env', () => {
    expect(() => assertExplicitPostgresConfig({})).not.toThrow()
    expect(() => assertExplicitPostgresConfig({}, { requireExplicit: false })).not.toThrow()
  })

  it('throws in built servers when NITRO_POSTGRES_* is missing instead of guessing localhost', () => {
    expect(() => assertExplicitPostgresConfig({}, { requireExplicit: true }))
      .toThrowError(/Missing NITRO_POSTGRES_\* environment variables: NITRO_POSTGRES_HOST/)

    expect(() => assertExplicitPostgresConfig({
      NITRO_POSTGRES_HOST: 'db.example',
      NITRO_POSTGRES_PORT: '5432',
      NITRO_POSTGRES_USER: 'app',
    }, { requireExplicit: true }))
      .toThrowError(/NITRO_POSTGRES_DB, NITRO_POSTGRES_PASSWORD/)
  })

  it('collects blank fields as missing but keeps an explicitly empty password', () => {
    expect(() => assertExplicitPostgresConfig({
      NITRO_POSTGRES_HOST: '   ',
      NITRO_POSTGRES_PORT: '',
      NITRO_POSTGRES_USER: '  ',
      NITRO_POSTGRES_PASSWORD: 'secret',
      NITRO_POSTGRES_DB: ' ',
    }, { requireExplicit: true }))
      .toThrowError(/NITRO_POSTGRES_HOST, NITRO_POSTGRES_USER, NITRO_POSTGRES_DB, NITRO_POSTGRES_PORT/)

    expect(() => assertExplicitPostgresConfig({
      NITRO_POSTGRES_HOST: 'db.example',
      NITRO_POSTGRES_PORT: '5432',
      NITRO_POSTGRES_USER: 'app',
      NITRO_POSTGRES_PASSWORD: '',
      NITRO_POSTGRES_DB: 'appdb',
    }, { requireExplicit: true })).not.toThrow()
  })

  it('rejects an invalid port in built servers and accepts a fully explicit config', () => {
    expect(() => assertExplicitPostgresConfig({
      NITRO_POSTGRES_HOST: 'db.example',
      NITRO_POSTGRES_PORT: 'not-a-port',
      NITRO_POSTGRES_USER: 'app',
      NITRO_POSTGRES_PASSWORD: 'secret',
      NITRO_POSTGRES_DB: 'appdb',
    }, { requireExplicit: true }))
      .toThrowError(/NITRO_POSTGRES_PORT is not a valid port/)

    expect(() => assertExplicitPostgresConfig({
      NITRO_POSTGRES_HOST: 'db.example',
      NITRO_POSTGRES_PORT: '5432',
      NITRO_POSTGRES_USER: 'app',
      NITRO_POSTGRES_PASSWORD: 'secret',
      NITRO_POSTGRES_DB: 'appdb',
    }, { requireExplicit: true })).not.toThrow()
  })
})

describe('drizzle dev database', () => {
  it('applies the schema and exposes the prepared instance', async () => {
    const db = await prepareDevDrizzle()

    await expect(seedRow(db)).resolves.toBeUndefined()
    expect(initDevDrizzle()).toBe(db)
  }, 30_000)

  it('drops rows but keeps the schema on resetDatabase', async () => {
    const db = await prepareDevDrizzle()
    await seedRow(db)

    const afterReset = await resetDatabase()

    expect(afterReset).toBe(db)
    expect(await db.query.users.findMany()).toEqual([])
    expect(await db.query.countEvents.findMany()).toEqual([])
    // Schema is re-applied, so inserts keep working after the reset.
    await expect(seedRow(db)).resolves.toBeUndefined()
  }, 30_000)

  it('prepares a fresh database when reset runs before prepare', async () => {
    vi.resetModules()
    const dev = await import('~/server/utils/drizzle/dev')

    expect(() => dev.initDevDrizzle()).toThrowError(/prepareDevDrizzle\(\) must be called/)

    const db = await dev.resetDatabase()

    expect(dev.initDevDrizzle()).toBe(db)
    await expect(seedRow(db)).resolves.toBeUndefined()
  }, 30_000)
})

describe('useDrizzle', () => {
  // The unit project does not define import.meta.MOCK_DATABASE, so
  // useDrizzle() resolves to the prod implementation here. The MOCK/dev
  // selection runs in the e2e suite, which defines MOCK_DATABASE=true.
  it('lazily initializes the prod database once and caches the instance', async () => {
    vi.resetModules()
    const dbStub = {} as DrizzleDatabase
    const initProdDrizzle = vi.fn(() => dbStub)
    vi.doMock('~/server/utils/drizzle/prod', () => ({ initProdDrizzle }))
    try {
      const { useDrizzle } = await import('~/server/utils/drizzle')

      const first = useDrizzle()
      const second = useDrizzle()

      expect(initProdDrizzle).toHaveBeenCalledTimes(1)
      expect(first.db).toBe(dbStub)
      expect(second.db).toBe(dbStub)
      expect(first.schema).toBe(second.schema)
      expect(first.relations).toBe(second.relations)
    }
    finally {
      vi.doUnmock('~/server/utils/drizzle/prod')
      vi.resetModules()
    }
  })
})
