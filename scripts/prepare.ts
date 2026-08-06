import { exit } from 'node:process'
import { createServer } from 'vite'

async function main() {
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
