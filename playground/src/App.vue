<script setup lang="ts">
import { Button, sum, useDouble } from 'package-name'
import { ref } from 'vue'
import 'package-name/styles/index.scss'

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
