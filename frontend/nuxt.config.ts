// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: 'latest',

  experimental: {
    typescriptPlugin: true,
    typedPages: true,
  },

  runtimeConfig: {
    databaseUrl: '',
  },

  nitro: {
    experimental: {
      tasks: true,
      asyncContext: true,
    },
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
    define: {
      'import.meta.MOCK_DATABASE': process.env.MOCK_DATABASE ?? 'undefined',
      'import.meta.vitest': 'undefined',
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
    schema: './server/graphql/schema.graphql',
    scalars: {},
  },

  ui: {
    fonts: false,
  },

  devtools: { enabled: true },

  eslint: {
    config: { standalone: false },
  },

  icon: {
    provider: 'server',
  },
})
