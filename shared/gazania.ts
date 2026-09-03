import type { DefineSchema, Field, Input, InputObjectType, ObjectType, ScalarType } from 'gazania'

type Scalar_Date = ScalarType<'Date', unknown, unknown>
type Scalar_UUID = ScalarType<'UUID', unknown, unknown>
type Scalar_Int = ScalarType<'Int', number, number>
type Scalar_Float = ScalarType<'Float', number, number>
type Scalar_String = ScalarType<'String', string, string>
type Scalar_Boolean = ScalarType<'Boolean', boolean, boolean>
type Scalar_ID = ScalarType<'ID', string, string | number>

type Input_CreateTodoInput = InputObjectType<'CreateTodoInput', {
  title: Input<Scalar_String>
}>

type Input_DeleteTodoInput = InputObjectType<'DeleteTodoInput', {
  id: Input<Scalar_ID>
}>

type Input_UpdateTodoInput = InputObjectType<'UpdateTodoInput', {
  completed: Input<Scalar_Boolean | null>
  id: Input<Scalar_ID>
  title: Input<Scalar_String | null>
}>

type Type_DeleteTodoPayload = ObjectType<'DeleteTodoPayload', {
  id: Field<Scalar_ID | null>
  success: Field<Scalar_Boolean | null>
}>

type Type_Mutation = ObjectType<'Mutation', {
  createTodo: Field<Type_Todo | null, {
    input: Input<Input_CreateTodoInput>
  }>
  deleteTodo: Field<Type_DeleteTodoPayload | null, {
    input: Input<Input_DeleteTodoInput>
  }>
  updateTodo: Field<Type_Todo | null, {
    input: Input<Input_UpdateTodoInput>
  }>
}>

type Type_PageInfo = ObjectType<'PageInfo', {
  endCursor: Field<Scalar_String | null>
  hasNextPage: Field<Scalar_Boolean>
  hasPreviousPage: Field<Scalar_Boolean>
  startCursor: Field<Scalar_String | null>
}>

type Type_Query = ObjectType<'Query', {
  todo: Field<Type_Todo | null, {
    id: Input<Scalar_ID>
  }>
  todos: Field<Type_QueryTodosConnection | null, {
    after: Input<Scalar_String | null>
    before: Input<Scalar_String | null>
    first: Input<Scalar_Int | null>
    last: Input<Scalar_Int | null>
  }>
}>

type Type_QueryTodosConnection = ObjectType<'QueryTodosConnection', {
  edges: Field<(Type_QueryTodosConnectionEdge | null)[] | null>
  pageInfo: Field<Type_PageInfo>
}>

type Type_QueryTodosConnectionEdge = ObjectType<'QueryTodosConnectionEdge', {
  cursor: Field<Scalar_String>
  node: Field<Type_Todo | null>
}>

type Type_Todo = ObjectType<'Todo', {
  completed: Field<Scalar_Boolean | null>
  createdAt: Field<Scalar_Date | null>
  id: Field<Scalar_ID | null>
  title: Field<Scalar_String | null>
  updatedAt: Field<Scalar_Date | null>
}>

export type Schema = DefineSchema<{
  Date: Scalar_Date
  UUID: Scalar_UUID
  Int: Scalar_Int
  Float: Scalar_Float
  String: Scalar_String
  Boolean: Scalar_Boolean
  ID: Scalar_ID
  CreateTodoInput: Input_CreateTodoInput
  DeleteTodoInput: Input_DeleteTodoInput
  UpdateTodoInput: Input_UpdateTodoInput
  DeleteTodoPayload: Type_DeleteTodoPayload
  Mutation: Type_Mutation
  PageInfo: Type_PageInfo
  Query: Type_Query
  QueryTodosConnection: Type_QueryTodosConnection
  QueryTodosConnectionEdge: Type_QueryTodosConnectionEdge
  Todo: Type_Todo
}>

declare module 'gazania' {
  interface Schemas {
    'http://localhost': Schema
  }
}
