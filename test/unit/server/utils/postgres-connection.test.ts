import { describe, expect, it } from 'vitest'
import { readPostgresConnection } from '~/server/utils/postgres-connection'

describe('readPostgresConnection', () => {
  it('keeps reserved URI characters in structured fields instead of embedding them in a URL', () => {
    const result = readPostgresConnection({
      POSTGRES_HOST: 'db.example',
      POSTGRES_PORT: '5432',
      POSTGRES_USER: 'app/user',
      POSTGRES_PASSWORD: 'p/a#ss?word',
      POSTGRES_DB: 'my#db',
    })

    expect(result).toEqual({
      host: 'db.example',
      port: 5432,
      user: 'app/user',
      password: 'p/a#ss?word',
      database: 'my#db',
    })
  })

  it('uses local compose.dev defaults when POSTGRES_* is missing or blank', () => {
    expect(readPostgresConnection({})).toEqual({
      host: 'localhost',
      port: 5433,
      user: 'user',
      password: 'passwd',
      database: 'mydb',
    })

    expect(readPostgresConnection({
      POSTGRES_HOST: '   ',
      POSTGRES_PORT: '',
      POSTGRES_USER: '  ',
      POSTGRES_DB: ' ',
    })).toEqual({
      host: 'localhost',
      port: 5433,
      user: 'user',
      password: 'passwd',
      database: 'mydb',
    })
  })

  it('preserves an explicitly empty password', () => {
    expect(readPostgresConnection({
      POSTGRES_PASSWORD: '',
    }).password).toBe('')
  })

  it('throws in built servers when POSTGRES_* is missing instead of guessing localhost', () => {
    expect(() => readPostgresConnection({}, { requireExplicit: true }))
      .toThrowError(/Missing POSTGRES_\* environment variables: POSTGRES_HOST/)

    expect(() => readPostgresConnection({
      POSTGRES_HOST: 'db.example',
      POSTGRES_PORT: '5432',
      POSTGRES_USER: 'app',
    }, { requireExplicit: true }))
      .toThrowError(/POSTGRES_DB, POSTGRES_PASSWORD/)
  })

  it('rejects an invalid port in built servers and accepts a fully explicit config', () => {
    expect(() => readPostgresConnection({
      POSTGRES_HOST: 'db.example',
      POSTGRES_PORT: 'not-a-port',
      POSTGRES_USER: 'app',
      POSTGRES_PASSWORD: 'secret',
      POSTGRES_DB: 'appdb',
    }, { requireExplicit: true }))
      .toThrowError(/POSTGRES_PORT is not a valid port/)

    expect(readPostgresConnection({
      POSTGRES_HOST: 'db.example',
      POSTGRES_PORT: '5432',
      POSTGRES_USER: 'app',
      POSTGRES_PASSWORD: 'secret',
      POSTGRES_DB: 'appdb',
    }, { requireExplicit: true })).toEqual({
      host: 'db.example',
      port: 5432,
      user: 'app',
      password: 'secret',
      database: 'appdb',
    })
  })
})
