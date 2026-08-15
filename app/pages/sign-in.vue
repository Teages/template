<script setup lang="ts">
import { useQueryCache } from '@pinia/colada'
import { refreshAuthSession } from '~/app/utils/auth-session'

const route = useRoute()
const router = useRouter()
const queryCache = useQueryCache()
const { $requestFetch } = useAppContext()

useHead({ title: 'Sign in' })
const pending = ref(false)
const error = ref<string | null>(null)

const email = ref('')
const password = ref('')

const redirectTo = computed(() => {
  const raw = route.query.redirect
  return typeof raw === 'string' && raw.startsWith('/') ? raw : '/'
})

async function onSubmit(): Promise<void> {
  pending.value = true
  error.value = null
  try {
    const { error: signInError } = await authClient.signIn.email({
      email: email.value,
      password: password.value,
      callbackURL: redirectTo.value,
    })
    if (signInError) {
      error.value = signInError.message ?? 'Invalid email or password'
      return
    }
    // The navigation guard reads the session from the query cache, so
    // refresh it before navigating to the protected destination.
    await refreshAuthSession({ queryCache, $requestFetch })
    await router.push(redirectTo.value)
  }
  finally {
    pending.value = false
  }
}
</script>

<template>
  <div class="flex min-h-[calc(100dvh-4rem)] items-center py-12">
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
            class="w-full"
          />
        </UFormField>

        <UFormField label="Password" required>
          <UInput
            v-model="password"
            type="password"
            autocomplete="current-password"
            required
            class="w-full"
          />
        </UFormField>

        <p v-if="error" class="text-sm text-error">
          {{ error }}
        </p>

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
          <RouterLink
            class="font-medium text-primary"
            to="/sign-up"
          >
            Sign up
          </RouterLink>
        </p>
      </template>
    </UCard>
  </div>
</template>
