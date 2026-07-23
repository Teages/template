import { createAuthClient } from 'better-auth/vue'

/** Same-origin `/api/auth` (see `#shared/utils/auth-path`, `nuxt.config` proxy). */
export const authClient = createAuthClient()

export const { signIn, signUp, signOut } = authClient
