import { env } from 'node:process'
import { nitro } from 'nitro/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    nitro(),
  ],
  server: {
    port: 20398,
    strictPort: true,
  },
  resolve: {
    tsconfigPaths: true,
  },
  define: {
    'import.meta.vitest': 'undefined',
    'import.meta.MOCK_DATABASE': env.MOCK_DATABASE || 'undefined',
  },
})
