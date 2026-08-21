import { describe, expect, it } from 'vitest'
import { assertExplicitPostgresConfig } from '~/server/utils/drizzle'

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
