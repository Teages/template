# Frontend

## Architecture

Standard nuxt project structure:
```
app/
  assets/
  components/
  composables/
  layouts/
  pages/
  plugins/
  middleware/
  utils/
  app.vue
```

Check AGENTS.md in these directories for rules.

## Libraries

- Use Nuxt UI and Tailwind CSS, check the documentation for components and utilities.
- Auto-imports are disabled (see the root `AGENTS.md`), so import everything explicitly: Nuxt UI components (`import { UButton } from '#components'`), module composables (`import { useToast } from '#imports'`) and local code (`~/components/...`, `~/composables/...`, `~/utils/...`).
- Prefer VueUse composables over writing your own, unless you have a good reason not to.
- Use better-auth for authentication, check `composables/auth/`.

## Components

- Place all components in `components/`
- Use PascalCase for naming, e.g. `MyComponent.vue`.
- Categorize components in subfolders, e.g. `components/app/AppHeader.vue`, `components/form/FormCheckbox.vue`, etc.

## Composables

- Place all composables in `composables/`
- Use camelCase for naming, e.g. `useMyComposable.ts`.
- Categorize composables in subfolders, e.g. `composables/api/useApiClient.ts`, `composables/auth/useSession.ts`, etc.

## Utils

- Place all utils in `utils/`
- Use camelCase for naming, e.g. `myUtil.ts`.
- Categorize utils in subfolders, e.g. `utils/date/formatDate.ts`, `utils/string/capitalize.ts`, etc.
