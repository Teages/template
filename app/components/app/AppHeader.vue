<script setup lang="ts">
const {
  title,
} = defineProps<{
  title: string
}>()
</script>

<template>
  <UHeader>
    <template #left>
      <NuxtLink to="/">
        <h1 class="text-xl font-bold">
          {{ title }}
        </h1>
      </NuxtLink>
    </template>

    <template #right>
      <UButton
        to="https://github.com/teages/template"
        target="_blank"
        icon="i-simple-icons-github"
        aria-label="GitHub"
        color="neutral"
        variant="ghost"
      />

      <UColorModeButton />
    </template>
  </UHeader>
</template>
