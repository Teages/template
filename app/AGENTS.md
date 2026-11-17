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
  units/
  app.vue
```

Check AGENTS.md in these directories for rules.

## Libraries

- Use [shadcn-vue](https://www.shadcn-vue.com) components and Tailwind CSS v4. The design tokens live in `assets/css/main.css`; prefer them (`bg-background`, `text-muted-foreground`, `border-border`, ...) over raw colors.
- shadcn components are owned code in `components/ui/` (generated from `components.json`). Add new ones with `pnpm dlx shadcn-vue@latest add <component>` instead of editing them by hand; `modules/shadcn` registers their barrel exports on `#components`, so import them explicitly: `import { Button, CardHeader } from '#components'` (no `Ui` prefix).
- Compose class names with `cn` from `cn` (also re-exported by `lib/utils.ts`); icons come from `@lucide/vue`; toasts use `toast` from `vue-sonner` (mounted by `<Toaster />` in `app.vue`).
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
