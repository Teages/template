# AGENTS.md

## Frameworks / Libraries
- Nuxt 5 (nightly) & Nitro 3
- GraphQL, check `shared/schema.graphql`
- Better Auth

## Structure

```
app/
modules/
public/
server/
shared/
tests/
```

If a deeper AGENTS.md exists in a subdirectory, follow the deeper file for files in that subtree.

## Commands
- pnpm install
- pnpm dev
- pnpm test
- pnpm typecheck
- pnpm lint
- pnpm lint:fix
- pnpm db:generate

## Code style
- use strict TypeScript, avoid `any` and `as unknown as X`
- Single quotes, no semicolons
- Linting with ESLint, try `pnpm lint` to check for issues, then `pnpm lint:fix` to auto-fix

## Agents Guidelines
- Write clear, concise, and well-documented code
- Follow best practices for security and performance
- Ensure code is modular and reusable
- Checkout the document when using libraries or frameworks components
- Commit messages should be clear and descriptive
- Avoid committing generated files or dependencies
