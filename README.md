# Package Template

fork from [unjs/template](https://github.com/unjs/template).

## Use this template

```bash
npx giget@latest gh:teages/template package-name
```

> [!NOTE]
> TODO:
> - [ ] Update package name: replace `package-name` with your package name
> - [ ] Update author name: replace `teages` with your name
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

Import:

```js
// ESM
import { test } from 'package-name'

// CommonJS
const { test } = require('package-name')
```

## Development

- Clone this repository
- Install latest LTS version of [Node.js](https://nodejs.org/en/)
- Enable [Corepack](https://github.com/nodejs/corepack) using `corepack enable`
- Install dependencies using `pnpm install`
- Run interactive tests using `pnpm dev`

## License

Published under [MIT License](./LICENSE).

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/package-name?style=flat&color=blue
[npm-version-href]: https://npmjs.com/package/package-name
[npm-downloads-src]: https://img.shields.io/npm/dm/package-name?style=flat&color=blue
[npm-downloads-href]: https://npmjs.com/package/package-name

<!-- [codecov-src]: https://img.shields.io/codecov/c/gh/Teages/package-name/main?style=flat&color=blue
[codecov-href]: https://codecov.io/gh/Teages/package-name

[bundle-src]: https://img.shields.io/bundlephobia/minzip/package-name?style=flat&color=blue
[bundle-href]: https://bundlephobia.com/result?p=package-name -->
