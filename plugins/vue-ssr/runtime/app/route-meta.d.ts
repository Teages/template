import 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    /**
     * HTTP status the SSR renderer responds with when this route matches.
     * Declared per page via the `definePage()` macro (e.g. 404 on the
     * catch-all page); see entry-server.ts.
     */
    statusCode?: number
  }
}
