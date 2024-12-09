<script setup lang="ts">
import type { ButtonProps } from '.'

const {
  content = 'It is a button',
} = defineProps<ButtonProps>()
</script>

<template>
  <button :class="$style.button">
    {{ content }}
  </button>
</template>

<style module>
.button {
  background-color: #4caf50;
  border: none;
  color: white;
  padding: 15px 32px;
  text-align: center;
  text-decoration: none;
  display: inline-block;
  font-size: 16px;
}
</style>
