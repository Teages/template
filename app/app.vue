<script setup lang="ts">
import { authClient } from '~/app/utils/auth-client'

interface AuthUser {
  readonly id: string
  readonly name: string
  readonly email: string
}

interface AuthSession {
  readonly user: AuthUser
  readonly session?: Record<string, unknown>
}

function isAuthSession(value: unknown): value is AuthSession {
  if (typeof value !== 'object' || value === null)
    return false
  if (!('user' in value))
    return false
  const user = value.user
  if (typeof user !== 'object' || user === null)
    return false
  return typeof user.name === 'string'
    && typeof user.email === 'string'
    && typeof user.id === 'string'
}

const { data: session } = await useAsyncData(
  'auth:session',
  async () => {
    const res = await fetch('/api/auth/get-session')
    if (!res.ok)
      return null
    const body: unknown = await res.json()
    return isAuthSession(body) ? body : null
  },
  {
    default: (): AuthSession | null => null,
  },
)

if (!import.meta.env.SSR) {
  authClient.hydrateSession(session.value)
}

const router = useRouter()

const displayName = computed(() => session.value?.user.name ?? 'Account')

const navItems = computed(() =>
  session.value?.user
    ? [{ label: 'Count', to: '/' }, { label: 'tRPC', to: '/trpc' }]
    : [
        { label: 'Count', to: '/' },
        { label: 'tRPC', to: '/trpc' },
        { label: 'Sign in', to: '/sign-in' },
        { label: 'Sign up', to: '/sign-up' },
      ],
)

async function onSignOut(): Promise<void> {
  await authClient.signOut()
  session.value = null
  authClient.hydrateSession(null)
  await router.push('/sign-in')
}
</script>

<template>
  <UApp>
    <UHeader title="Count App" to="/">
      <template #right>
        <div class="flex items-center gap-3">
          <UNavigationMenu :items="navItems" />
          <template v-if="session?.user">
            <span class="hidden text-sm text-muted sm:inline">
              {{ displayName }}
            </span>
            <UButton
              label="Sign out"
              color="neutral"
              variant="ghost"
              size="sm"
              @click="onSignOut"
            />
          </template>
        </div>
      </template>
    </UHeader>

    <UMain>
      <UContainer>
        <RouterView />
      </UContainer>
    </UMain>
  </UApp>
</template>
