import tailwindcss from '@tailwindcss/vite'

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
    define: {
      'import.meta.env.UPDATE_SCHEMA': false,
    },
    optimizeDeps: {
      include: [
        'gazania',
        'graphql',
        'better-auth/vue',
        'reka-ui',
        'cn',
        'vue-sonner',
        '@lucide/vue',
      ],
    },
    plugins: [
      tailwindcss(),
    ],
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
    nodeTsConfig: {
      include: [
        '../scripts/**/*.ts',
        '../*.ts',
        '../modules/*/index.ts',
        '../test/projects/*.ts',
      ],
    },
    sharedTsConfig: {
      include: [
        '../test/e2e/**/*.ts',
      ],
    },
  },

  modules: [
    '@nuxt/test-utils',
    '@nuxt/eslint',
    '@nuxtjs/color-mode',
    '@vueuse/nuxt',
    '@teages/nitro-drizzle/nuxt',
  ],

  shadcn: {
    prefix: '',
    componentDir: '@/components/ui',
  },

  colorMode: {
    // shadcn-vue targets the `.dark` class instead of Nuxt color mode's
    // default `-mode` suffix.
    classSuffix: '',
    preference: 'system',
    fallback: 'light',
    storageKey: 'nuxt-color-mode',
  },

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

  devtools: { enabled: true },

  eslint: {
    config: { standalone: false },
  },
})
