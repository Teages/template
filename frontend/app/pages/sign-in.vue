<script setup lang="ts">
import { authClient } from '~/utils/auth-client'

const route = useRoute()
const toast = useToast()
const pending = ref(false)

const email = ref('')
const password = ref('')

const redirectTo = computed(() => {
  const raw = route.query.redirect
  return typeof raw === 'string' && raw.startsWith('/') ? raw : '/'
})

async function onSubmit() {
  pending.value = true
  try {
    const { error } = await authClient.signIn.email({
      email: email.value,
      password: password.value,
      callbackURL: redirectTo.value,
    })
    if (error) {
      toast.add({
        title: 'Sign in failed',
        description: error.message ?? 'Invalid email or password',
        color: 'error',
      })
      return
    }
    await navigateTo(redirectTo.value)
  }
  finally {
    pending.value = false
  }
}

useSeoMeta({ title: 'Sign in' })
</script>

<template>
  <UContainer class="flex min-h-[calc(100dvh-4rem)] items-center py-12">
    <UCard class="mx-auto w-full max-w-md">
      <template #header>
        <h1 class="text-xl font-semibold">
          Sign in
        </h1>
        <p class="text-sm text-muted">
          Use your email and password.
        </p>
      </template>

      <form
        class="flex flex-col gap-4"
        @submit.prevent="onSubmit"
      >
        <UFormField label="Email" required>
          <UInput
            v-model="email"
            type="email"
            autocomplete="email"
            placeholder="you@example.com"
            required
          />
        </UFormField>

        <UFormField label="Password" required>
          <UInput
            v-model="password"
            type="password"
            autocomplete="current-password"
            required
          />
        </UFormField>

        <UButton
          type="submit"
          block
          :loading="pending"
        >
          Sign in
        </UButton>
      </form>

      <template #footer>
        <p class="text-center text-sm text-muted">
          No account?
          <NuxtLink
            class="font-medium text-primary"
            to="/sign-up"
          >
            Sign up
          </NuxtLink>
        </p>
      </template>
    </UCard>
  </UContainer>
</template>
