<script setup lang="ts">
const { data } = await useFetch('/api')
</script>

<template>
  <p>{{ data?.message }}</p>
</template>
