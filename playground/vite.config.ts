import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

import plugin from '../src/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue(), plugin()],
})
