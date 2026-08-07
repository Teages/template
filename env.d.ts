interface ImportMetaEnv {
  readonly BETTER_AUTH_SECRET?: string
  readonly BETTER_AUTH_URL?: string
  readonly BETTER_AUTH_TRUSTED_ORIGINS?: string
  readonly BETTER_AUTH_ALLOWED_HOSTS?: string
  readonly NODE_ENV?: string
  readonly VITEST?: string | boolean
}

interface ImportMeta {
  readonly MOCK_DATABASE?: string | boolean
  readonly DRIZZLE_STUDIO_KEY?: string
  readonly vitest?: typeof import('vitest')
}
