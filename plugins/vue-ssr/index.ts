import type { PluginOption, UserConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export const vueAssetsQuery = /\?assets/

export const vueSsrEnvironmentConfig = {
  environments: {
    client: {
      build: {
        rollupOptions: {
          input: './plugins/vue-ssr/runtime/app/entry-client.ts',
        },
      },
    },
    ssr: {
      build: {
        rollupOptions: {
          input: './plugins/vue-ssr/runtime/app/entry-server.ts',
        },
      },
    },
  },
} satisfies UserConfig

export function vueSsrPlugin(): PluginOption {
  return [
    vue({ exclude: vueAssetsQuery }),
    {
      name: 'internal:vue-ssr',
      config() {
        return vueSsrEnvironmentConfig
      },
    },
  ]
}
