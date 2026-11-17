<script setup lang="ts">
import { authClient } from '~/utils/auth-client'

const session = useSession()

const signingOut = ref(false)

async function onSignOut() {
  signingOut.value = true
  try {
    await authClient.signOut()
    await navigateTo('/sign-in')
  }
  finally {
    signingOut.value = false
  }
}
</script>

<template>
  <div
    v-if="session.isPending"
    class="size-9"
    aria-hidden="true"
  />

  <template v-else-if="session.data?.user">
    <span class="hidden text-sm text-muted-foreground sm:inline">
      {{ session.data.user.name ?? session.data.user.email }}
    </span>
    <Button
      variant="ghost"
      :disabled="signingOut"
      @click="onSignOut"
    >
      <Spinner v-if="signingOut" />
      Sign out
    </Button>
  </template>

  <Button
    v-else
    variant="secondary"
    as-child
  >
    <NuxtLink to="/sign-in">
      Sign in
    </NuxtLink>
  </Button>
</template>
