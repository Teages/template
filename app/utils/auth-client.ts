import { createAuthClient } from 'better-auth/vue'

export const authClient = createAuthClient()

export type AuthSession = typeof authClient.$Infer.Session

export const { signIn, signUp, signOut } = authClient

export const { useSession } = authClient
