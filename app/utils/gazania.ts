import type { Schema } from '#shared/gazania'
import { createGazania } from 'gazania'

export const gazania = createGazania({} as Schema)

export type { ResultOf, TypedDocumentNode, VariablesOf } from 'gazania'
