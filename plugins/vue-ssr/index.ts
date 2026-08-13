import type { PluginOption, UserConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export const vueAssetsQuery = /\?assets/

export const vueSsrEnvironmentConfig = {
  environments: {
    client: {
      build: {
        rollupOptions: {
          input: './app/entry-client.ts',
        },
      },
    },
    ssr: {
      build: {
        rollupOptions: {
          input: './app/entry-server.ts',
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
