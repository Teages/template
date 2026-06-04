import { env } from 'node:process'

const backendOrigin = env.NUXT_BACKEND_ORIGIN ?? 'http://localhost:20398'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: 'latest',

  experimental: {
    typescriptPlugin: true,
    typedPages: true,
    viteEnvironmentApi: env.NODE_ENV !== 'development',
  },

  css: ['~/assets/css/main.css'],

  imports: {
    dirs: [
      '~/composables',
      '~/composables/**/*.ts',
    ],
  },

  vite: {
    optimizeDeps: {
      include: ['gazania', 'graphql', 'better-auth/vue'],
    },
  },

  typescript: {
    tsConfig: {
      include: ['../test/unit/**/*.ts', '../test/nuxt/**/*.ts'],
    },
    nodeTsConfig: {
      include: ['../*.ts', '../test/e2e/**/*.ts', '../playwright.config.ts'],
    },
  },

  routeRules: {
    '/graphql': { proxy: `${backendOrigin}/graphql` },
    '/api/auth/**': { proxy: `${backendOrigin}/api/auth/**` },
  },

  devServer: {
    port: 20397,
  },

  modules: [
    '@nuxt/test-utils',
    '@nuxt/eslint',
    '@nuxt/ui',
    '@vueuse/nuxt',
    './modules/gazania',
  ],

  $test: {
    debug: {
      hydration: true,
    },
    experimental: {
      // Nuxt's module-mutation debugger proxies runtimeConfig, which
      // @nuxt/test-utils clones while building the Vitest project.
      debugModuleMutation: false,
    },
  },

  gazania: {
    schema: '../backend/server/graphql/schema.graphql',
    scalars: {},
  },

  devtools: { enabled: true },

  eslint: {
    config: { standalone: false },
  },

  icon: {
    provider: 'iconify',
  },
})
