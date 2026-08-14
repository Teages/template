import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const migrationsDir = resolve(import.meta.dirname, '../../../../server/database/migrations')

function readAppliedMigrationSql(): string {
  const folders = readdirSync(migrationsDir, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)

  return folders
    .map(folder => readFileSync(resolve(migrationsDir, folder, 'migration.sql'), 'utf8'))
    .join('\n')
}

describe('drizzle migrations', () => {
  it('creates Better Auth accounts.issuer so credential signup can insert', () => {
    expect(readAppliedMigrationSql()).toMatch(/"issuer"/)
  })
})
