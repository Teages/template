import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { exit } from 'node:process'
import { writeTSConfig } from 'pkg-types'
import { createServer } from 'vite'
import { getAppTSConfig, getNodeTSConfig, getServerTSConfig } from '../plugins/tsconfig'

async function main() {
  const rootDir = resolve(import.meta.dirname, '..')
  const buildDir = resolve(rootDir, 'node_modules/.nitro')

  await mkdir(buildDir, { recursive: true })

  const appConfig = getAppTSConfig(rootDir, buildDir)
  const serverConfig = getServerTSConfig(rootDir, buildDir)
  const nodeConfig = getNodeTSConfig(rootDir, buildDir)

  await Promise.all([
    writeTSConfig(resolve(buildDir, 'tsconfig.app.json'), appConfig),
    writeTSConfig(resolve(buildDir, 'tsconfig.server.json'), serverConfig),
    writeTSConfig(resolve(buildDir, 'tsconfig.node.json'), nodeConfig),
  ])

  const server = await createServer({
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
