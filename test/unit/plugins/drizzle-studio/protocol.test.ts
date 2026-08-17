import { PGlite } from '@electric-sql/pglite'
import { sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  handleStudioProtocol,
  validateStudioAuthorization,
} from '~/plugins/drizzle-studio/runtime/server/protocol'

describe('validateStudioAuthorization', () => {
  it('reports an unavailable key as not configured', () => {
    expect(validateStudioAuthorization(undefined, null)).toBe('not-configured')
  })

  it('rejects missing or incorrect authorization', () => {
    expect(validateStudioAuthorization('studio-key', null)).toBe('unauthorized')
    expect(validateStudioAuthorization('studio-key', 'Bearer wrong-key')).toBe('unauthorized')
  })

  it('accepts the proxy authorization', () => {
    expect(validateStudioAuthorization('studio-key', 'Bearer studio-key')).toBeUndefined()
  })
})

describe('handleStudioProtocol', () => {
  // Drizzle over in-memory Postgres so proxy/tproxy/bproxy exercise the ORM API.
  const client = new PGlite()
  const db = drizzle({ client })

  beforeAll(async () => {
    await db.execute(
      'CREATE TABLE studio_items (id serial PRIMARY KEY, name text NOT NULL)',
    )
    await db.execute(sql`
      INSERT INTO studio_items (name) VALUES (${'alpha'}), (${'beta'})
    `)
  })

  afterAll(async () => {
    await client.close()
  })

  it('rejects malformed protocol requests', async () => {
    const response = await handleStudioProtocol(db, {})

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      status: 'error',
      error: 'Invalid Studio protocol request',
    })
  })

  it('answers the initialization request without querying the database', async () => {
    const response = await handleStudioProtocol(db, { type: 'init' })

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      version: '6.3',
      dialect: 'postgresql',
      driver: 'drizzle-orm',
    })
  })

  it('returns object-mode rows for a proxy query', async () => {
    const response = await handleStudioProtocol(db, {
      type: 'proxy',
      data: { sql: 'SELECT id, name FROM studio_items ORDER BY id' },
    })

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual([
      { id: 1, name: 'alpha' },
      { id: 2, name: 'beta' },
    ])
  })

  it('honors array row mode for a proxy query', async () => {
    const response = await handleStudioProtocol(db, {
      type: 'proxy',
      data: {
        sql: 'SELECT name FROM studio_items ORDER BY id',
        mode: 'array',
      },
    })

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual([['alpha'], ['beta']])
  })

  it('binds $n after an identifier that contains dollar signs', async () => {
    const response = await handleStudioProtocol(db, {
      type: 'proxy',
      data: {
        sql: 'SELECT 1 AS foo$tag$, $1::int AS value',
        params: [7],
      },
    })

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual([{ foo$tag$: 1, value: 7 }])
  })

  it('binds $n params without rewriting the same token in a string literal', async () => {
    const response = await handleStudioProtocol(db, {
      type: 'proxy',
      data: {
        sql: 'SELECT \'$1\' AS literal, $1::int AS value',
        params: [7],
      },
    })

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual([{ literal: '$1', value: 7 }])
  })

  it('binds positional params on a proxy query', async () => {
    const response = await handleStudioProtocol(db, {
      type: 'proxy',
      data: {
        sql: 'SELECT $1::int + $2::int AS sum',
        params: [2, 3],
      },
    })

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual([{ sum: 5 }])
  })

  it('normalizes binary params to JSON before binding', async () => {
    const response = await handleStudioProtocol(db, {
      type: 'proxy',
      data: {
        sql: 'SELECT $1::text AS v',
        params: [{ type: 'binary', value: { foo: 1 } }],
      },
    })

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual([{ v: '{"foo":1}' }])
  })

  it('keeps timestamp values as strings', async () => {
    const response = await handleStudioProtocol(db, {
      type: 'proxy',
      data: {
        sql: 'SELECT \'2024-01-02T03:04:05Z\'::timestamptz AS ts',
      },
    })

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual([
      { ts: expect.stringMatching(/^2024-01-02/) as string },
    ])
  })

  it('returns each result set of a tproxy batch in order', async () => {
    const response = await handleStudioProtocol(db, {
      type: 'tproxy',
      data: [
        { sql: 'SELECT name FROM studio_items ORDER BY id LIMIT 1' },
        { sql: 'SELECT count(*)::int AS total FROM studio_items' },
      ],
    })

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual([
      [{ name: 'alpha' }],
      [{ total: 2 }],
    ])
  })

  it('rolls back a tproxy batch on error and surfaces the failure', async () => {
    const response = await handleStudioProtocol(db, {
      type: 'tproxy',
      data: [
        { sql: 'INSERT INTO studio_items (name) VALUES (\'gamma\')' },
        { sql: 'SELECT * FROM nonexistent_table' },
      ],
    })

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual([
      [],
      { error: expect.stringMatching(/nonexistent_table/) as string },
    ])

    const verify = await handleStudioProtocol(db, {
      type: 'proxy',
      data: { sql: 'SELECT count(*)::int AS total FROM studio_items' },
    })
    await expect(verify.json()).resolves.toEqual([{ total: 2 }])
  })

  it('runs a bproxy the requested number of times and returns timings', async () => {
    const response = await handleStudioProtocol(db, {
      type: 'bproxy',
      data: { query: { sql: 'SELECT 1 AS n' }, repeats: 3 },
    })

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual([
      expect.any(Number) as number,
      expect.any(Number) as number,
      expect.any(Number) as number,
    ])
  })

  it('rejects the defaults request with a server error', async () => {
    const response = await handleStudioProtocol(db, {
      type: 'defaults',
      data: [],
    })

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({
      status: 'error',
      error: 'Custom defaults are not configured',
    })
  })
})
