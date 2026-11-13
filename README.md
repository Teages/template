## Use this template

```bash
npx giget@latest gh:teages/template#vue-module package-name
```

> [!NOTE]
> TODO:
> - [ ] Update package name: replace `package-name` with your package name
> - [ ] Update repo path: replace `Teages/repo` with your package name
> - [ ] Update author name: replace `Teages` with your name
> - [ ] Install autofix.ci
> - [ ] Update package description
> - [ ] Update usage examples
> - [ ] Update playground examples
> - [ ] Remove things before this line

# package-name

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]

<!-- [![bundle][bundle-src]][bundle-href] -->
<!-- [![Codecov][codecov-src]][codecov-href] -->

This is my package description.

## Usage

Install package:

```sh
# npm
npm install package-name

# yarn
yarn add package-name

# pnpm
pnpm install package-name

# bun
bun install package-name
```

### Manual import

```ts
import { Button, sum, useDouble } from 'package-name'
// import styles when not using the auto import integrations
import 'package-name/styles'
```

### Auto import with Vite

Install the unplugin plugins as dev dependencies:

```sh
pnpm install -D unplugin-auto-import unplugin-vue-components
```

Then register the preset and resolver:

```ts
// vite.config.ts
import vue from '@vitejs/plugin-vue'
import { unimportPreset } from 'package-name/presets'
import { componentResolver } from 'package-name/resolvers'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    vue(),
    AutoImport({
      imports: [unimportPreset],
    }),
    Components({
      resolvers: [
        componentResolver()
      ],
    }),
  ],
})
```

`unplugin-auto-import` and `unplugin-vue-components` will generate the
`auto-imports.d.ts` and `components.d.ts` files for you.

If you prefer `unimport` to scan the package exports instead of listing them
upfront, use the package preset:

```ts
AutoImport({
  packagePresets: [packagePreset],
})
```

Resolver options:

```ts
componentResolver({
  prefix: 'P', // component name prefix, default to `P`
  importStyle: true, // import `package-name/styles` together with components
})
```

### Nuxt

As a Nuxt Module:

```ts
export default defineNuxtConfig({
  modules: ['package-name/nuxt'],
})
```

## Development

- Clone this repository
- Install [Node.js](https://nodejs.org/en/) 26 or newer
- Enable [Corepack](https://github.com/nodejs/corepack) using `npm install -g corepack && corepack enable` (Node.js 26 no longer ships Corepack)
- Install dependencies using `pnpm install`
- Run interactive tests using `pnpm dev`

## License

Published under [MIT License](./LICENSE).

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/package-name?style=flat&color=blue
[npm-version-href]: https://npmjs.com/package/package-name
[npm-downloads-src]: https://img.shields.io/npm/dm/package-name?style=flat&color=blue
[npm-downloads-href]: https://npmjs.com/package/package-name

<!-- [codecov-src]: https://img.shields.io/codecov/c/gh/Teages/repo/main?style=flat&color=blue
[codecov-href]: https://codecov.io/gh/Teages/repo

[bundle-src]: https://img.shields.io/bundlephobia/minzip/package-name?style=flat&color=blue
[bundle-href]: https://bundlephobia.com/result?p=package-name -->
