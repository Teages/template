<script setup lang="ts">
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
  <UForm class="w-full" @submit.prevent="onSubmit">
    <UFieldGroup class="w-full">
      <UInput
        v-model="title"
        class="flex-1"
        placeholder="What needs to be done?"
        autocomplete="off"
        :disabled="pending"
      />
      <UButton
        type="submit"
        icon="i-lucide-plus"
        label="Add"
        :loading="pending"
        :disabled="!title.trim()"
      />
    </UFieldGroup>
  </UForm>
</template>
