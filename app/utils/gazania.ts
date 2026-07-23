import type { Schema } from '#gazania/schema'
import { createGazania } from 'gazania'

export const gazania = createGazania({} as Schema)

export type { ResultOf, TypedDocumentNode, VariablesOf } from 'gazania'
