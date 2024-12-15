import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig(async () => {
  const { env } = await import('node:process')
  const { plugin } = env.VITE_PACKAGE_SOURCE === 'dist'
    ? await import('package-name/unplugin')
    : await import('../src/unplugin')

  return {
    plugins: [vue(), plugin.vite()],
  }
})
