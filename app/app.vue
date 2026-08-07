<script setup lang="ts">
import type { AuthSession } from '~/app/utils/auth-session'
import { useQuery, useQueryCache } from '@pinia/colada'
import { authClient } from '~/app/utils/auth-client'
import { fetchAuthSession } from '~/app/utils/auth-session'
import { AUTH_SESSION_QUERY_KEY } from '~/app/utils/query-keys'

const { $requestFetch } = useAppContext()

const queryCache = useQueryCache()
const { data: session } = useQuery<AuthSession | null>({
  key: AUTH_SESSION_QUERY_KEY,
  query: () => fetchAuthSession($requestFetch),
})

if (!import.meta.env.SSR) {
  authClient.hydrateSession(session.value ?? null)
}

const router = useRouter()

const displayName = computed(() => session.value?.user.name ?? 'Account')

const navItems = computed(() =>
  session.value?.user
    ? [
        { label: 'GraphQL', to: '/' },
        { label: 'REST', to: '/rest' },
        { label: 'tRPC', to: '/trpc' },
      ]
    : [
        { label: 'GraphQL', to: '/' },
        { label: 'REST', to: '/rest' },
        { label: 'tRPC', to: '/trpc' },
        { label: 'Sign in', to: '/sign-in' },
        { label: 'Sign up', to: '/sign-up' },
      ],
)

async function onSignOut(): Promise<void> {
  await authClient.signOut()
  queryCache.setQueryData(AUTH_SESSION_QUERY_KEY, null)
  authClient.hydrateSession(null)
  await router.push('/sign-in')
}
</script>

<template>
  <UApp>
    <UHeader title="API Template" to="/">
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
