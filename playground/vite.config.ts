import { fileURLToPath } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { dirname, resolve } from 'pathe'
import { defineConfig } from 'vite'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],

  resolve: {
    alias: { 'package-name': resolve(__dirname, '../src/') },
  },
})
