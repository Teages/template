import vue from '@vitejs/plugin-vue'
import { unimportPreset } from 'package-name/presets'
import { componentResolver } from 'package-name/resolvers'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig(async () => {
  return {
    plugins: [
      vue(),
      AutoImport({
        // Alternatively, let unimport scan the package exports:
        // packagePresets: [packagePreset],
        imports: [unimportPreset],
        dts: 'auto-imports.d.ts',
      }),
      Components({
        resolvers: [
          componentResolver(),
        ],
        dts: 'components.d.ts',
      }),
    ],
  }
})
