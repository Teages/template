import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { exit } from 'node:process'
import { writeTSConfig } from 'pkg-types'
import { createServer } from 'vite'
import { generatedCleanPlugin } from '../plugins/generated-clean/index.ts'
import {
  getNodeTSConfig,
  getServerTSConfig,
  resolveGeneratedTSConfigDir,
} from '../plugins/tsconfig'

async function main() {
  const rootDir = resolve(import.meta.dirname, '..')
  const tsconfigDir = resolveGeneratedTSConfigDir(rootDir)
  const paths = {
    rootDir,
    tsconfigDir,
    buildDir: resolve(rootDir, 'node_modules/.nitro'),
  }

  await mkdir(tsconfigDir, { recursive: true })

  const serverConfig = getServerTSConfig(paths)
  const nodeConfig = getNodeTSConfig(paths)

  await Promise.all([
    writeTSConfig(resolve(tsconfigDir, 'tsconfig.server.json'), serverConfig),
    writeTSConfig(resolve(tsconfigDir, 'tsconfig.node.json'), nodeConfig),
  ])

  const server = await createServer({
    // Empties `.generated` before the plugin chain below regenerates it —
    // this boot is the one context that rewrites every artifact, so only
    // it may clear.
    plugins: [generatedCleanPlugin()],
    logLevel: 'silent',
    server: {
      middlewareMode: true,
      watch: null,
      hmr: false,
    },
  })

  await server.close()
}

main()
  .then(() => exit(0))
  .catch((err) => {
    console.error(err)
    exit(1)
  })
