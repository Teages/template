<script setup>
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

const title = 'My Nuxt App'
const description = 'This is my Nuxt app'

useSeoMeta({ title, description })
</script>

<template>
  <UApp>
    <AppHeader :title />

    <UMain>
      <NuxtPage />
    </UMain>
  </UApp>
</template>
