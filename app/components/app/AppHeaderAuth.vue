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
    class="size-8"
    aria-hidden="true"
  />

  <template v-else-if="session.data?.user">
    <span class="hidden text-sm text-muted sm:inline">
      {{ session.data.user.name ?? session.data.user.email }}
    </span>
    <UButton
      color="neutral"
      variant="ghost"
      :loading="signingOut"
      @click="onSignOut"
    >
      Sign out
    </UButton>
  </template>

  <UButton
    v-else
    to="/sign-in"
    color="neutral"
    variant="soft"
  >
    Sign in
  </UButton>
</template>
