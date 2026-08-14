<script setup lang="ts">
definePage({
  // Propagated to the SSR response status by entry-server.ts.
  meta: {
    statusCode: 404,
  },
})

useHead({ title: 'Page not found' })
</script>

<template>
  <div class="flex flex-col items-center gap-4 py-20 text-center">
    <h1 class="text-4xl font-bold text-highlighted">
      404
    </h1>
    <p class="text-muted">
      Page not found
    </p>
    <UButton label="Back home" to="/" icon="i-lucide-home" />
  </div>
</template>
