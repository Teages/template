import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [vue() as any],
  test: {
    environment: 'happy-dom',
    coverage: {
      include: [
        'src/components/**/*',
        'src/composables/**/*',
        'src/utils/**/*',
      ],
    },
  },
})
