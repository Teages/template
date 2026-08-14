<script setup lang="ts">
import { useQueryCache } from '@pinia/colada'
import { refreshAuthSession } from '~/app/utils/auth-session'
import { useAppContext } from '~/plugins/vue-ssr/runtime/app/composables/useAppContext'

const router = useRouter()
const queryCache = useQueryCache()
const { $requestFetch } = useAppContext()
const pending = ref(false)
const error = ref<string | null>(null)

const name = ref('')
const email = ref('')
const password = ref('')

async function onSubmit(): Promise<void> {
  pending.value = true
  error.value = null
  try {
    const { error: signUpError } = await authClient.signUp.email({
      name: name.value,
      email: email.value,
      password: password.value,
      callbackURL: '/',
    })
    if (signUpError) {
      error.value = signUpError.message ?? 'Could not create account'
      return
    }
    // The navigation guard reads the session from the query cache, so
    // refresh it before navigating to the protected destination.
    await refreshAuthSession({ queryCache, $requestFetch })
    await router.push('/')
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
          Sign up
        </h1>
        <p class="text-sm text-muted">
          Create an account with email and password.
        </p>
      </template>

      <form
        class="flex flex-col gap-4"
        @submit.prevent="onSubmit"
      >
        <UFormField label="Name" required>
          <UInput
            v-model="name"
            type="text"
            autocomplete="name"
            placeholder="Your name"
            required
          />
        </UFormField>

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
            autocomplete="new-password"
            minlength="8"
            required
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
          Create account
        </UButton>
      </form>

      <template #footer>
        <p class="text-center text-sm text-muted">
          Already have an account?
          <RouterLink
            class="font-medium text-primary"
            to="/sign-in"
          >
            Sign in
          </RouterLink>
        </p>
      </template>
    </UCard>
  </div>
</template>
