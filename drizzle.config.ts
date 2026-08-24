import { loadDrizzleConfig } from '@teages/nitro-drizzle/config'

// Resolved from the Nitro config at runtime: the connection comes from
// runtimeConfig.drizzle.connection plus NITRO_DRIZZLE_CONNECTION_* overrides,
// the schema points at the source entry, and migrations stay in
// server/database/migrations.
export default await loadDrizzleConfig()
