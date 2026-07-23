# GraphQL Schema Architecture

Code-first GraphQL using **Pothos** (`@pothos/core`) with the **Drizzle plugin** (`@pothos/plugin-drizzle`), served via **GraphQL Yoga** over Nitro's H3 HTTP framework. The `schema.graphql` file is auto-generated for development reference only — TypeScript files are the source of truth.

## Directory Layout

```
server/graphql/
├── builder.ts              # Singleton SchemaBuilder with DrizzlePlugin (context: { event: H3Event })
├── schema.ts               # Gathers schema files via import.meta.glob, builds & exports schema
├── schema.graphql          # Auto-generated SDL (dev artifact, DO NOT EDIT)
└── schema/
    └── <domain>/
        ├── <Type>.ts                  # Core type: drizzleObject + base fields, export the ref
        ├── <Type>.<field>.ts          # Extension: single relation field via drizzleObjectFields
        └── operations/
            └── <query>.ts             # Query or mutation root field via t.drizzleField
```

Each `<domain>/` directory is a self-contained module for one business entity.

## File Naming Conventions

| Pattern | Purpose |
|---|---|
| `<Type>.ts` | Core type definition — calls `builder.drizzleObject('table', ...)`, defines base scalar fields, exports the ref for use by other files |
| `<Type>.<field>.ts` | Extension file — calls `builder.drizzleObjectFields(ref, t => ...)` to add a single relation field using `t.relation('relationName')` |
| `operations/<name>.ts` | Query or mutation root field definition using `t.drizzleField` with `db.query.*` |

## Registration via Side Effects

`schema.ts` uses two `import.meta.glob` patterns to eagerly load files:

- `./schema/*/operations/*.ts` — all operation files
- `./schema/*/*.*.ts` — all extension files (two-dot pattern excludes core `<Type>.ts` files)

Each loaded file calls `builder.drizzleObjectFields(...)` or `builder.queryFields(...)` directly on the shared builder. Core type files are imported explicitly in extension files (their refs are needed for `drizzleObjectFields`).

**No changes to `schema.ts` are needed when adding new files** — glob imports pick them up automatically.

## Adding a New Domain

1. Create `schema/<domain>/<Type>.ts` — call `builder.drizzleObject('table', { name: 'PascalCaseName', ... })` with singular PascalCase `name`, define base fields, export the ref.
2. Create `schema/<domain>/<Type>.<field>.ts` — for each relation, use `builder.drizzleObjectFields(ref, t => ({ field: t.relatedConnection('relationName') }))` for list relations or `t.relation('relationName')` for single relations.
3. Create `schema/<domain>/operations/<query>.ts` — for list queries use `t.drizzleConnection` with Relay pagination; for single-record queries use `t.drizzleField` + `db.query.<table>.findFirst`.

## Key Files Outside schema/

| File | Role |
|---|---|
| `server/graphql/builder.ts` | Singleton `SchemaBuilder` with DrizzlePlugin configured. Context: `{ event: H3Event }`. DrizzleRelations type from `~/server/database/relations`. |
| `server/graphql/schema.ts` | Builds the final schema via `builder.toSchema()`. Dev-only: writes `schema.graphql` on change for inspection. |
| `server/routes/graphql.ts` | GraphQL Yoga HTTP handler at `/graphql`, wires Yoga into Nitro's H3 event system. |
| `server/plugins/graphql-hmr.ts` | Dev-only Nitro plugin: on HMR, imports `graphql/schema.ts` so `schema.graphql` / `gazania.ts` stay in sync. |
| `server/utils/drizzle.ts` | `useDrizzle()` factory (call per-request). Test mock replaces this with a PGlite in-memory db. |

## In-Source Testing

Tests live alongside their source code inside `if (import.meta.vitest)` blocks. The test infrastructure is provided by `test/setup.ts` (auto-loaded by vitest), which mocks `useDrizzle()` with a PGlite in-memory database seeded with deterministic data.

**RULES**:
- Only one `describe()` block per file, named after the query, type or type field being tested (e.g. `query post` or `User type` or `User.posts`).
- Use dynamic imports to load external modules which only used in tests. Dynamic imports should be inside the `describe()` block.

### Where Tests Go

| Location | Tests for |
|---|---|
| `operations/<query>.ts` | Happy path, null/empty cases, pagination, and relation fields accessed via that query |
| `<Type>.ts` (core type file) | Computed fields (custom `resolve:` logic that isn't a simple `exposeX`) |

Relation extension files (`<Type>.<field>.ts`) have no tests of their own — relations are covered by tests in the operation files that query them.

### Test Setup

```ts
if (import.meta.vitest) {
  const { it, describe, expect } = import.meta.vitest

  describe('query <name>', async () => {
    const { createGraphQLTestClient } = await import('~/test/utils')
    const { serverFetch } = await import('nitro/app')
    const client = createGraphQLTestClient(serverFetch)

    it('...', async () => { /* ... */ })
  })
}
```

- `client.query(gql, variables)` returns `data` directly (errors throw).
- `useDrizzle()` called inside test blocks returns the mocked PGlite db — use it to fetch known seed values for assertions.
- `serverFetch` is the Nitro in-process fetch, so no real HTTP server is needed.

### What to Test

**Operations (queries):**
- **Scalar fields**: query a known record by id, assert `id` + key fields match db values.
- **Nullable query**: request a non-existent id (e.g. `00000000-0000-0000-0000-000000000000`), assert result is `null` with `toMatchInlineSnapshot`.
- **Relation fields**: include nested objects/lists in the query; assert shape matches the db row fetched with `with: { relation: true }`.
- **Pagination** (connection queries): assert default page size via `first`, cursor-based forward pagination via `after`, and that `hasNextPage` / `endCursor` behave correctly. Compare edges against consecutive slices from a direct db query.

**Computed fields (custom resolvers on types):**
- Query the field on a known record and assert the derived value matches the expected computation (e.g. `fullName === \`${firstName} ${lastName}\``).

### Critical Convention

Always use `useDrizzle()` inside resolvers — **never** a module-level `db` default import. The test mock only replaces `useDrizzle`; a module-level singleton would bypass the mock and hit the real database (or be `undefined` in test environments).

## GraphQL Naming Conventions

**Reference**: [Apollo GraphQL Naming Conventions](https://www.apollographql.com/docs/graphos/schema-design/guides/naming-conventions)

All GraphQL names MUST follow Apollo conventions:

### Type Names (PascalCase, singular)

`drizzleObject` defaults to using the Drizzle table name. **Always** override with singular PascalCase via the `name` option:

```typescript
// ❌ Wrong — uses table name directly
builder.drizzleObject('users', { fields() { /* ... */ } })
// Produces: type users { ... }

// ✅ Correct — singular PascalCase
builder.drizzleObject('users', { name: 'User', fields() { /* ... */ } })
// Produces: type User { ... }
```

**Mapping table:**

| Drizzle Table | GraphQL Type Name |
|---|---|
| `users` | `User` |
| `emails` | `Email` |
| `files` | `File` |
| `userProfiles` | `UserProfile` |
| `userSessions` | `UserSession` |
| `oauthAccounts` | `OAuthAccount` |
| `levels` | `Level` |
| `charts` | `Chart` |
| `records` | `Record` |
| `todos` | `Todo` |

### Field Names (camelCase)

All field names and argument names must be `camelCase`. This is the default for Pothos `expose*` methods — no action needed unless defining custom fields.

### Enum Values (SCREAMING_SNAKE_CASE)

All PostgreSQL enum values must be `SCREAMING_SNAKE_CASE`. Define enums in `server/database/schema.ts` with uppercase values:

```typescript
// ❌ Wrong
export const resourceState = pgEnum('resource_state', ['public', 'private', 'unlisted'])

// ✅ Correct
export const resourceState = pgEnum('resource_state', ['PUBLIC', 'PRIVATE', 'UNLISTED'])
```

**Note**: Changing enum values requires a database migration (ALTER TYPE ... RENAME VALUE).

### Mutation Names (camelCase, verb prefix)

Mutations must start with a verb: `createLevel`, `updateLevel`, `deleteLevel`, `submitRecord`, `publishLevel`, etc.

### Query Names (camelCase, no `get`/`list` prefix)

Queries must NOT use verb prefixes like `get` or `list`:
- ✅ `levels`, `level`, `user`, `me`, `record`
- ❌ `getLevels`, `listRecords`, `findUser`

### Input Types (suffixed with `Input`)

Input types must end with `Input`: `RecordDetailsInput`, `CreateLevelInput`, etc.

### Payload Types (suffixed with `Payload`)

Mutation return types must end with `Payload`: `AuthPayload`, `DeleteLevelPayload`, etc.

## Relay Pagination

All list fields MUST use Relay-style cursor pagination (Connection / Edge / Node). Use the Pothos Drizzle plugin's built-in Relay integration.

**Reference**: [Pothos Drizzle Relay Integration](https://pothos-graphql.dev/docs/plugins/drizzle#relay-integration)

### Root-level list queries

Use `t.drizzleConnection` instead of `t.field` returning an array:

```typescript
// ❌ Wrong — raw array with take/cursor
builder.queryFields(t => ({
  levels: t.field({
    type: [levelRef],
    args: { take: t.arg.int(), cursor: t.arg.int() },
    resolve: async (_root, args) => { /* ... */ }
  })
}))

// ✅ Correct — Relay connection
builder.queryFields(t => ({
  levels: t.drizzleConnection({
    type: 'levels',
    name: 'LevelConnection',
    resolve: (query, _root, args, ctx) =>
      useDrizzle().db.query.levels.findMany(
        query({ where: { state: 'public' } })
      )
  })
}))
```

### Nested relation list fields

Use `t.relatedConnection` for Drizzle relations:

```typescript
// ❌ Wrong — raw array
builder.drizzleObjectFields(levelRef, t => ({
  charts: t.relation('charts', { query: { limit: 20 } })
}))

// ✅ Correct — Relay connection
builder.drizzleObjectFields(levelRef, t => ({
  charts: t.relatedConnection('charts', {
    query: () => ({ orderBy: { id: 'asc' } })
  })
}))
```

### For relations not directly in Drizzle schema

Use `drizzleConnectionHelpers` for indirect connections:

```typescript
import { drizzleConnectionHelpers } from '@pothos/plugin-drizzle'

const helpers = drizzleConnectionHelpers(builder, 'records', {
  select: nestedSelection => ({ /* ... */ }),
  resolveNode: row => row,
})
```

### Schema Regeneration

After any schema change, run:

```bash
pnpm schema:update
```

This boots dev briefly; `server/plugins/graphql-hmr.ts` and `graphql/schema.ts` print `schema.graphql` and `gazania.ts`.
