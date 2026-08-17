# GraphQL Schema Guide

This subtree defines the code-first GraphQL schema with Pothos, the Drizzle plugin, Relay, and GraphQL Yoga. TypeScript schema files are the source of truth. `schema.graphql` and `.generated/shared/gazania.d.ts` are generated outputs.

## Structure

```text
server/graphql/schema/
└── <domain>/
    ├── <Type>.ts
    ├── <Type>.<field>.ts
    └── operations/
        └── <operation>.ts
```

- `<Type>.ts` defines a core Drizzle object and exports its reference.
- `<Type>.<field>.ts` extends a type with one relation or derived field.
- `operations/<operation>.ts` registers query or mutation root fields.

`server/graphql/schema.ts` eagerly imports operation and extension files with `import.meta.glob`. New files that follow this layout require no central registration change.

## Resolver Rules

- Call `useDrizzle()` inside every resolver. Never capture the database at module scope.
- Enforce protected operations with `requireAuthSession(event)` from `server/graphql/errors.ts`, and declare `UnauthorizedError` in the field's `errors` option.
- Keep database ordering deterministic. Add a unique tie-breaker after non-unique columns.
- Use Drizzle-aware Pothos fields and relations so selection sets control database loading.
- Return domain-safe errors as data. Do not expose database or internal implementation details.

## Errors as Data

Domain failures are typed members of the schema, not masked GraphQL errors (errors plugin in `builder.ts`):

- Define error classes in `server/graphql/errors.ts` as `Error` subclasses and register them against the shared `Error` interface in `builder.ts`.
- Fields opt in via `errors: { types: [...] }`. Object-typed fields should add `directResult: true` so the Result union contains the payload itself; scalar fields use the generated `<Parent><Field>Success` wrapper with a `data` field.
- Clients and tests select `__typename` and match inline fragments (`... on UnauthorizedError { message }`) instead of parsing error messages.
- Undeclared errors stay on the GraphQL error path and are masked by Yoga's `maskedErrors` in production.

## Schema Conventions

- Use singular PascalCase object names, such as `CountEvent` and `User`.
- Use camelCase field and argument names.
- Use verb-prefixed mutation names, such as `recordCount`.
- Do not prefix queries with `get` or `list`.
- Suffix input object names with `Input`.
- Suffix mutation result objects with `Payload`.
- Keep fields non-null unless absence is a real domain state. The builder defaults to non-null fields.
- Use SCREAMING_SNAKE_CASE for GraphQL enum values.

## Relay Pagination

Every list field must use Relay cursor pagination.

- Use `t.drizzleConnection` for root Drizzle lists.
- Use `t.relatedConnection` for list relations.
- Include stable ordering with a unique tie-breaker.
- Expose and test `pageInfo`, forward pagination with `first` and `after`, and empty/final pages.

Do not replace connections with raw arrays or offset pagination.

## Mutations

Mutations should return a dedicated payload object even when they create one record. A payload can expose the created object and useful mutation metadata without coupling the schema to flat response shapes.

```ts
const RecordCountPayload = builder.simpleObject('RecordCountPayload', {
  fields: t => ({
    countEvent: t.field({ type: CountEvent }),
    totalCount: t.int(),
  }),
})
```

## Tests

Place GraphQL e2e tests under `test/e2e/api/graphql/<domain>/operations/`.

Each operation suite must cover the behavior relevant to that operation:

- authentication failures;
- successful scalar and relation selections;
- mutation payloads and database effects;
- empty or missing records;
- Relay pagination and `pageInfo`;
- deterministic ordering.

Use `createGraphQLTestClient(serverFetch, { cookie })` and Gazania documents. Reset the PGlite database before mutation-sensitive tests.

## Generation and Verification

Run these commands after schema changes:

```bash
pnpm prepare
pnpm typecheck
pnpm test:e2e
pnpm lint
```

Review and commit `schema.graphql`. Do not edit generated declarations under `.generated/`.
