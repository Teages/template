<script setup lang="ts">
import { Plus } from '@lucide/vue'
import { ref } from 'vue'
import { Button, Input, Spinner } from '#components'

const emit = defineEmits<{
  create: [title: string]
}>()

const title = ref('')
const pending = ref(false)

async function onSubmit() {
  const value = title.value.trim()
  if (!value || pending.value)
    return

  pending.value = true
  try {
    emit('create', value)
    title.value = ''
  }
  finally {
    pending.value = false
  }
}
</script>

<template>
  <form
    class="flex w-full items-center gap-2"
    @submit.prevent="onSubmit"
  >
    <Input
      v-model="title"
      class="flex-1"
      placeholder="What needs to be done?"
      autocomplete="off"
      :disabled="pending"
    />
    <Button
      type="submit"
      :disabled="pending || !title.trim()"
    >
      <Spinner v-if="pending" />
      <Plus v-else />
      Add
    </Button>
  </form>
</template>
