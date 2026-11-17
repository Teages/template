<script setup lang="ts">
import { computed, ref } from 'vue'
import { toast } from 'vue-sonner'
import { navigateTo, useRoute, useSeoMeta } from '#app'
import { Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, Input, Label, NuxtLink, Spinner } from '#components'
import { authClient } from '~/utils/auth-client'

const route = useRoute()
const pending = ref(false)

const email = ref('')
const password = ref('')

const redirectTo = computed(() => {
  const raw = route.query.redirect
  return typeof raw === 'string' && raw.startsWith('/')
    ? raw
    : '/'
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
      toast.error('Sign in failed', {
        description: error.message ?? 'Invalid email or password',
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
  <div class="flex min-h-[calc(100dvh-4rem)] items-center px-4 py-12">
    <Card class="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle class="text-xl">
          Sign in
        </CardTitle>
        <CardDescription>
          Use your email and password.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form
          class="flex flex-col gap-4"
          @submit.prevent="onSubmit"
        >
          <div class="grid gap-2">
            <Label for="email">Email</Label>
            <Input
              id="email"
              v-model="email"
              type="email"
              autocomplete="email"
              placeholder="you@example.com"
              required
            />
          </div>

          <div class="grid gap-2">
            <Label for="password">Password</Label>
            <Input
              id="password"
              v-model="password"
              type="password"
              autocomplete="current-password"
              required
            />
          </div>

          <Button
            type="submit"
            class="w-full"
            :disabled="pending"
          >
            <Spinner v-if="pending" />
            Sign in
          </Button>
        </form>
      </CardContent>

      <CardFooter class="justify-center">
        <p class="text-sm text-muted-foreground">
          No account?
          <NuxtLink
            class="font-medium text-primary hover:underline"
            to="/sign-up"
          >
            Sign up
          </NuxtLink>
        </p>
      </CardFooter>
    </Card>
  </div>
</template>
