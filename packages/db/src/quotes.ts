import { and, asc, desc, eq, inArray, isNull, like } from "drizzle-orm";

import type { Database } from "./index";
import type { PersonSummary } from "./persons";
import { user } from "./schema/auth";
import { person } from "./schema/person";
import { card, quote } from "./schema/quote";
import type { QuoteRecord } from "./schema/quote";

/**
 * A Card of a Quote's text. Its audit stamps are its Quote's: a Card is only
 * ever written as part of a Quote save, so it carries no stamps of its own
 * (ADR-0001).
 */
export interface CardOfQuote {
  id: string;
  position: number;
  text: string;
  createdBy: string;
  updatedBy: string;
}

/** A Quote's words and metadata, without the Person it belongs to. */
export interface QuoteContent {
  id: string;
  slug: string;
  editorialNote: string;
  date: string | null;
  place: string | null;
  cards: CardOfQuote[];
}

/** A Quote as its permalink renders it. */
export interface QuoteForPage extends QuoteContent {
  person: PersonSummary;
}

/** A Quote as the admin list shows it, including who touched it last. */
export interface QuoteInAdmin extends QuoteContent {
  createdBy: string;
  updatedBy: string;
  updatedByName: string | null;
  createdAt: Date;
}

interface Stamp {
  createdBy: string;
  updatedBy: string;
}

/** A Card as it is stored, before its Quote's stamps are attached. */
type UnstampedCard = Omit<CardOfQuote, "createdBy" | "updatedBy">;

const CONTENT_COLUMNS = {
  id: quote.id,
  slug: quote.slug,
  editorialNote: quote.editorialNote,
  date: quote.date,
  place: quote.place,
  createdBy: quote.createdBy,
  updatedBy: quote.updatedBy,
};

/** Cards for `quoteIds` in reading order, grouped by their Quote. */
async function cardsByQuote(
  db: Database,
  quoteIds: string[]
): Promise<Map<string, UnstampedCard[]>> {
  const grouped = new Map<string, UnstampedCard[]>();

  if (quoteIds.length === 0) {
    return grouped;
  }

  const rows = await db
    .select({
      id: card.id,
      quoteId: card.quoteId,
      position: card.position,
      text: card.text,
    })
    .from(card)
    .where(inArray(card.quoteId, quoteIds))
    .orderBy(asc(card.quoteId), asc(card.position));

  for (const { quoteId, ...cardRow } of rows) {
    const cards = grouped.get(quoteId) ?? [];
    cards.push(cardRow);
    grouped.set(quoteId, cards);
  }

  return grouped;
}

/** Stamps a Card with the Quote that owns it. */
function stampCards(cards: UnstampedCard[], stamp: Stamp): CardOfQuote[] {
  return cards.map((cardRow) => ({ ...cardRow, ...stamp }));
}

async function quoteContentById(
  db: Database,
  id: string
): Promise<QuoteContent | null> {
  const [row] = await db
    .select(CONTENT_COLUMNS)
    .from(quote)
    .where(eq(quote.id, id))
    .limit(1);

  if (!row) {
    return null;
  }

  const grouped = await cardsByQuote(db, [row.id]);

  return {
    id: row.id,
    slug: row.slug,
    editorialNote: row.editorialNote,
    date: row.date,
    place: row.place,
    cards: stampCards(grouped.get(row.id) ?? [], row),
  };
}

/**
 * The Quote whose permalink is `/<person-slug>/<quote-slug>`, or `null` when no
 * such page exists. Archived Quotes and archived Persons are not served.
 */
export async function findQuoteForPage(
  db: Database,
  personSlug: string,
  quoteSlug: string
): Promise<QuoteForPage | null> {
  const [row] = await db
    .select({
      ...CONTENT_COLUMNS,
      personId: person.id,
      personName: person.name,
      personSlug: person.slug,
      personBio: person.bio,
    })
    .from(quote)
    .innerJoin(person, eq(quote.personId, person.id))
    .where(
      and(
        eq(person.slug, personSlug),
        eq(quote.slug, quoteSlug),
        isNull(quote.archivedAt),
        isNull(person.archivedAt)
      )
    )
    .limit(1);

  if (!row) {
    return null;
  }

  const grouped = await cardsByQuote(db, [row.id]);

  return {
    id: row.id,
    slug: row.slug,
    editorialNote: row.editorialNote,
    date: row.date,
    place: row.place,
    cards: stampCards(grouped.get(row.id) ?? [], row),
    person: {
      id: row.personId,
      name: row.personName,
      slug: row.personSlug,
      bio: row.personBio,
    },
  };
}

/**
 * Every Quote under one Person, newest first. This is what the admin lists;
 * a reader sees each Quote on its own permalink at this stage.
 */
export async function listQuotesForPerson(
  db: Database,
  personId: string
): Promise<QuoteInAdmin[]> {
  const rows = await db
    .select({
      ...CONTENT_COLUMNS,
      createdAt: quote.createdAt,
      updatedByName: user.name,
    })
    .from(quote)
    .leftJoin(user, eq(quote.updatedBy, user.id))
    .where(and(eq(quote.personId, personId), isNull(quote.archivedAt)))
    .orderBy(desc(quote.createdAt), desc(quote.id));

  const grouped = await cardsByQuote(
    db,
    rows.map((row) => row.id)
  );

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    editorialNote: row.editorialNote,
    date: row.date,
    place: row.place,
    cards: stampCards(grouped.get(row.id) ?? [], row),
    createdBy: row.createdBy,
    updatedBy: row.updatedBy,
    updatedByName: row.updatedByName,
    createdAt: row.createdAt,
  }));
}

/** The stored row for `id`, archived or not: used to hold a slug to its first value. */
export async function findQuoteById(
  db: Database,
  id: string
): Promise<QuoteRecord | null> {
  const [row] = await db.select().from(quote).where(eq(quote.id, id)).limit(1);

  return row ?? null;
}

/**
 * The slugs already taken under `base` for one Person, archived Quotes
 * included: a withdrawn Quote's permalink must not be handed to another.
 */
export async function slugsUnderPerson(
  db: Database,
  personId: string,
  base: string
): Promise<string[]> {
  const rows = await db
    .select({ slug: quote.slug })
    .from(quote)
    .where(and(eq(quote.personId, personId), like(quote.slug, `${base}%`)));

  return rows.map(({ slug }) => slug);
}

export interface QuoteDraft {
  personId: string;
  slug: string;
  editorialNote: string;
  date: string | null;
  place: string | null;
  /** The Card texts in reading order; their position is the array order. */
  cards: string[];
  actorId: string;
}

export interface QuoteEdits {
  editorialNote: string;
  date: string | null;
  place: string | null;
  cards: string[];
  actorId: string;
}

function cardRows(quoteId: string, texts: string[]) {
  return texts.map((text, index) => ({
    id: `card_${crypto.randomUUID()}`,
    quoteId,
    position: index + 1,
    text,
  }));
}

export async function insertQuote(
  db: Database,
  draft: QuoteDraft
): Promise<QuoteContent> {
  const id = `quote_${crypto.randomUUID()}`;
  const now = new Date();

  await db.transaction(async (tx) => {
    await tx.insert(quote).values({
      id,
      personId: draft.personId,
      slug: draft.slug,
      editorialNote: draft.editorialNote,
      date: draft.date,
      place: draft.place,
      createdBy: draft.actorId,
      updatedBy: draft.actorId,
      createdAt: now,
      updatedAt: now,
    });
    await tx.insert(card).values(cardRows(id, draft.cards));
  });

  const written = await quoteContentById(db, id);

  if (!written) {
    throw new Error("The Quote was not written");
  }

  return written;
}

/**
 * Rewrites everything but the slug, which is frozen at creation (ADR-0001).
 * The Cards are replaced wholesale: the form edits a Quote's wording as one
 * ordered list, so add, remove and reorder are all one write.
 */
export async function reviseQuote(
  db: Database,
  id: string,
  edits: QuoteEdits
): Promise<QuoteContent | null> {
  const revised = await db.transaction(async (tx) => {
    const [row] = await tx
      .update(quote)
      .set({
        editorialNote: edits.editorialNote,
        date: edits.date,
        place: edits.place,
        updatedBy: edits.actorId,
        updatedAt: new Date(),
      })
      .where(eq(quote.id, id))
      .returning({ id: quote.id });

    if (!row) {
      return false;
    }

    await tx.delete(card).where(eq(card.quoteId, id));
    await tx.insert(card).values(cardRows(id, edits.cards));

    return true;
  });

  if (!revised) {
    return null;
  }

  return quoteContentById(db, id);
}
