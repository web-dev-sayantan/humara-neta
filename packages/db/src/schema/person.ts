import {
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

import { user } from "./auth";

/**
 * A Person: a public figure whose quotes the site publishes. Their slug is
 * derived from the name on first save and frozen afterwards, because a changed
 * slug breaks links already shared (ADR-0001).
 */
export const person = sqliteTable(
  "person",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    bio: text("bio"),
    /** Set when an Administrator withdraws the Person; the row is kept. */
    archivedAt: integer("archived_at", { mode: "timestamp_ms" }),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id),
    updatedBy: text("updated_by")
      .notNull()
      .references(() => user.id),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [uniqueIndex("person_slug_unique").on(table.slug)]
);

export type PersonRecord = typeof person.$inferSelect;
