**IMPORTANT**: KEEP THIS FILE UP TO DATE

# AGENTS.md

## TEMPLATE NOTICE

Remove this section once you have set up your project.

It's a project template, update this file when you start to build. 

You will need to find a good [nuxt ui template](https://ui.nuxt.com/templates) when you need to build the user interface.


## Frameworks / Libraries
- Nuxt 5 (nightly) & Nitro 3
- **Explicit imports only**: Nuxt auto-imports are disabled through `nuxt-explicit-imports` (`explicitImports.mode: 'strict'` in `nuxt.config.ts`). Import composables, components and server helpers yourself — see [Explicit imports](#explicit-imports).
- GraphQL, check `shared/schema.graphql`
- Persisted operations: `modules/persisted-operations` extracts Gazania operations from `app/` into the Nitro virtual module `#graphql/persisted-operations`. Production Yoga executes only those documents.
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

## Explicit imports

Auto-imports are off for `imports`, `components` and `server`; the build fails on any implicit use. Never write a bare `ref()`/`useFetch()` or a bare `<UButton>` tag expecting Nuxt to resolve it.

| What | Import from |
| --- | --- |
| Vue (`ref`, `computed`, ...) | `vue` |
| Nuxt composables (`useFetch`, ...) | `#app` (sub-paths such as `#app/composables/pages` for `definePageMeta`) |
| Module composables (`useToast`, `useColorMode`) | `#imports` |
| `app/composables/**`, `app/utils/**` | `~/composables/...`, `~/utils/...` |
| `shared/**` | `#shared/...` |
| Vue components, Nuxt UI components (`UButton`, `UCard`, ...), `NuxtLink`, `NuxtPage` | `#components` or `~/components/<path>.vue` |
| Server helpers (`useDrizzle`) | `#drizzle`, `#server/utils/...` |
| h3 / Nitro (`defineEventHandler`) | `nitro/h3`, `nitro/app` |

```vue
<script setup lang="ts">
import { computed, ref } from 'vue'
import { UButton } from '#components'
import { useApiClient } from '~/composables/api/useApiClient'
</script>
```

`pnpm exec nuxt-explicit-imports check` lists any implicit use (and writes `.nuxt/explicit-imports-report.json`); `pnpm exec nuxt-explicit-imports migrate` writes the missing imports. Tests and config files are skipped by the checker, so keep their imports explicit by hand.

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
