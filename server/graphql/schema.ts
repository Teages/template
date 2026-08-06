import { builder } from './builder'

import.meta.glob('./schema/*/operations/*.ts', { eager: true })
import.meta.glob('./schema/*/*.*.ts', { eager: true })

export const schema = builder.toSchema()
