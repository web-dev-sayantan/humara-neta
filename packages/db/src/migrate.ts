import { join } from "node:path";

import { migrate } from "drizzle-orm/libsql/migrator";

import type { Database } from "./index";

const MIGRATIONS_FOLDER = join(import.meta.dirname, "migrations");

/**
 * Applies every migration in `src/migrations` to the given database. Used by
 * tests against a throwaway database; the deployed database is migrated with
 * `drizzle-kit migrate`.
 */
export function migrateToLatest(db: Database) {
  return migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
}
