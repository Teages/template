<script setup lang="ts">
import { Moon, Sun } from '@lucide/vue'

const colorMode = useColorMode()

function toggle() {
  colorMode.preference = colorMode.value === 'dark'
    ? 'light'
    : 'dark'
}
</script>

<template>
  <!-- Both icons are always rendered and switched by CSS, so the SSR markup
  matches the client markup regardless of the resolved color mode. -->
  <Button
    variant="ghost"
    size="icon"
    aria-label="Toggle theme"
    @click="toggle"
  >
    <Sun class="size-4 dark:hidden" />
    <Moon class="hidden size-4 dark:block" />
  </Button>
</template>
