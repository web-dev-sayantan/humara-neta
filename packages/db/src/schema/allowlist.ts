import { sql } from "drizzle-orm";
import { check, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

/**
 * The set of email addresses allowed to sign in, each with a role. Read, never
 * written, by the application: rows are added and removed with SQL. See
 * `docs/adr/0003-allowlist-gated-auth.md`.
 */
export const allowlist = sqliteTable(
  "allowlist",
  {
    email: text("email").primaryKey(),
    role: text("role", { enum: ["admin", "editor"] }).notNull(),
  },
  (table) => [
    check("allowlist_role", sql`${table.role} in ('admin', 'editor')`),
    uniqueIndex("allowlist_email_lower").on(sql`lower(${table.email})`),
  ],
);

export type Role = (typeof allowlist.$inferSelect)["role"];
