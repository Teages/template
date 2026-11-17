<script setup lang="ts">
import { ref } from 'vue'
import { toast } from 'vue-sonner'
import { navigateTo, useSeoMeta } from '#app'
import { Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, Input, Label, NuxtLink, Spinner } from '#components'
import { authClient } from '~/utils/auth-client'

const pending = ref(false)

const name = ref('')
const email = ref('')
const password = ref('')

async function onSubmit() {
  pending.value = true
  try {
    const { error } = await authClient.signUp.email({
      name: name.value,
      email: email.value,
      password: password.value,
      callbackURL: '/',
    })
    if (error) {
      toast.error('Sign up failed', {
        description: error.message ?? 'Could not create account',
      })
      return
    }
    await navigateTo('/')
  }
  finally {
    pending.value = false
  }
}

useSeoMeta({ title: 'Sign up' })
</script>

<template>
  <div class="flex min-h-[calc(100dvh-4rem)] items-center px-4 py-12">
    <Card class="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle class="text-xl">
          Sign up
        </CardTitle>
        <CardDescription>
          Create an account with email and password.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form
          class="flex flex-col gap-4"
          @submit.prevent="onSubmit"
        >
          <div class="grid gap-2">
            <Label for="name">Name</Label>
            <Input
              id="name"
              v-model="name"
              type="text"
              autocomplete="name"
              placeholder="Your name"
              required
            />
          </div>

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
              autocomplete="new-password"
              minlength="8"
              required
            />
          </div>

          <Button
            type="submit"
            class="w-full"
            :disabled="pending"
          >
            <Spinner v-if="pending" />
            Create account
          </Button>
        </form>
      </CardContent>

      <CardFooter class="justify-center">
        <p class="text-sm text-muted-foreground">
          Already have an account?
          <NuxtLink
            class="font-medium text-primary hover:underline"
            to="/sign-in"
          >
            Sign in
          </NuxtLink>
        </p>
      </CardFooter>
    </Card>
  </div>
</template>
