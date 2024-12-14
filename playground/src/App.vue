<script setup lang="ts">
import { computed, ref } from 'vue'

const count = ref(0)
const double = useDouble(count)
const doublePlusOne = computed(() => sum(double.value, 1))
const doublePlusThree = useDouble(count, { add: 3 })
</script>

<template>
  <div>
    <p>
      Hello Vue! Powered by Vite.
    </p>
    <p>
      {{ count }} * 2 = {{ double }}
    </p>
    <p>
      {{ count }} * 2 + 1 = {{ doublePlusOne }}
    </p>
    <p>
      {{ count }} * 2 + 3 = {{ doublePlusThree }}
    </p>
    <PButton content="Click me" @click="count++" />
  </div>
</template>
