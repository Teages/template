import vue from '@vitejs/plugin-vue'
import plugin from 'package-name/vite'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig(async () => {
  return {
    plugins: [
      vue(),
      plugin(),
    ],
  }
})
