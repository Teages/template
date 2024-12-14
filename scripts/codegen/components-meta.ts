import { codegenHead, updateFile } from '../utils'
import { scanComponents } from './index-export'

const componentMetaFilePath = 'components-meta.ts'

export default async function () {
  const components = await scanComponents()

  const res = components.map((component) => {
    const nameInit = component.names[0]
    const name = typeof nameInit === 'string'
      ? nameInit
      : nameInit.as

    if (name) {
      return [name, component.from] as const
    }

    return null
  }).filter(item => !!item)

  const output = [
    codegenHead,
    `export default ${JSON.stringify(Object.fromEntries(res), null, 2)} as const`,
    '',
  ].join('\n')
  updateFile(componentMetaFilePath, output)
}
