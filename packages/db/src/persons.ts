import { and, asc, eq, isNull, like, sql } from "drizzle-orm";

import type { Database } from "./index";
import { person } from "./schema/person";
import type { PersonRecord } from "./schema/person";

/** What a public page and the admin list show about a Person. */
export interface PersonSummary {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
}

const SUMMARY_COLUMNS = {
  id: person.id,
  name: person.name,
  slug: person.slug,
  bio: person.bio,
};

/**
 * Every non-archived Person, ordered by name. Ordering ignores case so
 * "ada" and "Zora" sort the way a reader expects rather than the way SQLite
 * compares bytes.
 */
export async function listPersons(db: Database): Promise<PersonSummary[]> {
  const rows = await db
    .select(SUMMARY_COLUMNS)
    .from(person)
    .where(isNull(person.archivedAt))
    .orderBy(sql`lower(${person.name})`, asc(person.name));

  return rows;
}

/** The Person whose page lives at `slug`, or `null` when no such page exists. */
export async function findPersonBySlug(
  db: Database,
  slug: string
): Promise<PersonSummary | null> {
  const [row] = await db
    .select(SUMMARY_COLUMNS)
    .from(person)
    .where(and(eq(person.slug, slug), isNull(person.archivedAt)))
    .limit(1);

  return row ?? null;
}

/** The stored row for `id`, archived or not: used to hold a slug to its first value. */
export async function findPersonById(
  db: Database,
  id: string
): Promise<PersonRecord | null> {
  const [row] = await db
    .select()
    .from(person)
    .where(eq(person.id, id))
    .limit(1);

  return row ?? null;
}

/**
 * The slugs already taken under `base`, archived rows included: a withdrawn
 * Person's slug must not be handed to someone else either.
 */
export async function slugsUnder(
  db: Database,
  base: string
): Promise<string[]> {
  const rows = await db
    .select({ slug: person.slug })
    .from(person)
    .where(like(person.slug, `${base}%`));

  return rows.map(({ slug }) => slug);
}

export interface PersonEdits {
  name: string;
  bio: string | null;
  actorId: string;
}

export interface NewPerson extends PersonEdits {
  slug: string;
}

export async function insertPerson(
  db: Database,
  { name, slug, bio, actorId }: NewPerson
): Promise<PersonSummary> {
  const now = new Date();
  const [row] = await db
    .insert(person)
    .values({
      id: `person_${crypto.randomUUID()}`,
      name,
      slug,
      bio,
      createdBy: actorId,
      updatedBy: actorId,
      createdAt: now,
      updatedAt: now,
    })
    .returning(SUMMARY_COLUMNS);

  if (!row) {
    throw new Error("The Person was not written");
  }

  return row;
}

/** Edits everything but the slug, which is frozen at creation (ADR-0001). */
export async function revisePerson(
  db: Database,
  id: string,
  { name, bio, actorId }: PersonEdits
): Promise<PersonSummary | null> {
  const [row] = await db
    .update(person)
    .set({ name, bio, updatedBy: actorId, updatedAt: new Date() })
    .where(eq(person.id, id))
    .returning(SUMMARY_COLUMNS);

  return row ?? null;
}
