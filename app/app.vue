<script setup lang="ts">
useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' },
  ],
  link: [
    { rel: 'icon', href: '/favicon.ico' },
  ],
  htmlAttrs: {
    lang: 'en',
  },
})

const title = 'TODOs'
const description = 'Todo list powered by GraphQL'

useSeoMeta({ title, description })
</script>

<template>
  <div class="flex min-h-dvh flex-col">
    <AppHeader :title />

    <main class="flex-1">
      <NuxtPage />
    </main>

    <Toaster position="top-center" />
  </div>
</template>
