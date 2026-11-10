import { loadDrizzleConfig } from '@teages/nitro-drizzle/config'

// Resolved from the Nitro config at runtime: connection templates expand
// from NITRO_DRIZZLE_CONNECTION_*,
// the schema points at the source entry, and migrations stay in
// server/database/migrations.
export default await loadDrizzleConfig()
