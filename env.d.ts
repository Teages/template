interface ImportMetaEnv {
  readonly BETTER_AUTH_SECRET?: string
  readonly BETTER_AUTH_URL?: string
  readonly BETTER_AUTH_TRUSTED_ORIGINS?: string
  readonly BETTER_AUTH_ALLOWED_HOSTS?: string
  readonly NODE_ENV?: string
  // Boolean false when the vite define statically disables the dev database;
  // a string when the raw env var reaches import.meta.env.
  readonly NITRO_DRIZZLE_DEV?: string | false
  readonly VITEST?: string | boolean
}

interface ImportMeta {
  readonly DRIZZLE_STUDIO_KEY?: string
  readonly vitest?: typeof import('vitest')
}
