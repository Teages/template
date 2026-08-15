<script setup lang="ts">
import type { AuthSession } from '~/app/utils/auth-session'
import { useQuery, useQueryCache } from '@pinia/colada'
import { authClient } from '~/app/utils/auth-client'
import { AUTH_SESSION_STALE_TIME, fetchAuthSession } from '~/app/utils/auth-session'
import { AUTH_SESSION_QUERY_KEY } from '~/app/utils/query-keys'

const { $requestFetch } = useAppContext()

const queryCache = useQueryCache()
const { data: session } = useQuery<AuthSession | null>({
  key: AUTH_SESSION_QUERY_KEY,
  query: () => fetchAuthSession($requestFetch),
  // The navigation guard fetches the session once at hydration (see
  // app/utils/auth-session.ts); this query only reads that cache entry and
  // never runs on the server, keeping the session out of the SSR payload.
  enabled: () => !import.meta.env.SSR,
  staleTime: AUTH_SESSION_STALE_TIME,
})

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
