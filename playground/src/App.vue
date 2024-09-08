<script setup lang="ts">
import { Button } from 'package-name/components/button'
import { useDouble } from 'package-name/composables/double'
import { sum } from 'package-name/utils/sum'
import { ref } from 'vue'
import 'package-name/styles/index.css'

const count = ref(0)
const double = useDouble(count)
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
      {{ count }} * 2 + 1 = {{ sum(double, 1) }}
    </p>
    <Button content="Click me" @click="count++" />
  </div>
</template>
