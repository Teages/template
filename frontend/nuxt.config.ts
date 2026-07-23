// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: 'latest',

  experimental: {
    typescriptPlugin: true,
    typedPages: true,
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

  // `/graphql` and `/api/auth/**` are proxied via explicit server routes
  // (see server/routes/graphql.ts, server/api/auth/[...].ts). Do NOT switch
  // back to routeRules.proxy — Nitro 3 beta's proxy recurses onto itself under
  // Nuxt 5 nightly's globalThis.fetch override.

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
