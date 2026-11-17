<script setup>
import { useHead, useSeoMeta } from '#app'
import { NuxtPage, UApp, UMain } from '#components'
import AppHeader from '~/components/app/AppHeader.vue'

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
  <UApp>
    <AppHeader :title />

    <UMain>
      <NuxtPage />
    </UMain>
  </UApp>
</template>
