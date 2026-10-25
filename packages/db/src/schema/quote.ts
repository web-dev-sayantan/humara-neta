import {
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

import { user } from "./auth";
import { person } from "./person";

/**
 * A Quote: what a Person said, attributed to them, with the Editorial note that
 * explains it and the optional Date and Place that accompany it. The slug is
 * unique per Person and frozen after first save, because links to it are
 * already circulating (ADR-0001).
 *
 * The Date is stored as a calendar day (`YYYY-MM-DD`) rather than an instant:
 * a day is the whole precision the product promises, and an instant would
 * invite timezone bugs for a value that never has a time.
 */
export const quote = sqliteTable(
  "quote",
  {
    id: text("id").primaryKey(),
    personId: text("person_id")
      .notNull()
      .references(() => person.id),
    slug: text("slug").notNull(),
    editorialNote: text("editorial_note").notNull(),
    /** A calendar day, `YYYY-MM-DD`, or `null` when the editor did not know it. */
    date: text("date"),
    place: text("place"),
    /** Set when an Administrator withdraws the Quote; the row is kept. */
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
  (table) => [
    uniqueIndex("quote_person_slug_unique").on(table.personId, table.slug),
  ]
);

/**
 * One Card of a Quote's text. `position` is contiguous from 1 and fixes the
 * reading order of the Carousel.
 *
 * Cards carry no audit stamps of their own: a Card is only ever written as part
 * of its Quote, so its Quote's `created_by` / `updated_by` covers it (ADR-0001).
 */
export const card = sqliteTable(
  "card",
  {
    id: text("id").primaryKey(),
    quoteId: text("quote_id")
      .notNull()
      .references(() => quote.id),
    position: integer("position").notNull(),
    text: text("text").notNull(),
  },
  (table) => [
    uniqueIndex("card_quote_position_unique").on(table.quoteId, table.position),
  ]
);

export type QuoteRecord = typeof quote.$inferSelect;
export type CardRecord = typeof card.$inferSelect;
