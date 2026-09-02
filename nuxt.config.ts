// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: 'latest',

  experimental: {
    typescriptPlugin: true,
    typedPages: true,
    nitroViteEnvironment: true,
  },

  nitro: {
    experimental: {
      tasks: true,
      asyncContext: true,
      envExpansion: true,
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
  },

  typescript: {
    appTsConfig: {
      include: [
        '../test/unit/app/**/*.ts',
      ],
    },
    serverTsConfig: {
      include: [
        '../test/api/**/*.ts',
        '../test/unit/server/**/*.ts',
      ],
    },
    nodeTsConfig: { include: ['../modules/*/index.ts'] },
  },

  modules: [
    '@nuxt/test-utils',
    '@nuxt/eslint',
    '@nuxt/ui',
    '@vueuse/nuxt',
    '@teages/nitro-drizzle/nuxt',
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

  drizzle: {
    dialect: 'postgresql',
    driver: 'postgres-js',
    schemaPath: './server/database/index.ts',
    migrationsDir: './server/database/migrations',
    devMock: {
      studio: true,
    },
    connection: {
      host: '{{POSTGRES_HOST}}',
      port: '{{POSTGRES_PORT}}',
      user: '{{POSTGRES_USER}}',
      password: '{{POSTGRES_PASSWORD}}',
      database: '{{POSTGRES_DB}}',
    },
  },

  migration: {
    migrationsDir: './server/database/migrations',
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
