import type { Database } from "@humara-neta/db";
import { findPersonById } from "@humara-neta/db/persons";
import {
  findQuoteById,
  findQuoteForPage,
  insertQuote,
  listQuotesForPerson,
  reviseQuote,
  slugsUnderPerson,
} from "@humara-neta/db/quotes";
import { ORPCError } from "@orpc/server";
import { z } from "zod";

import { authedProcedure } from "../authorize";
import { DAY_PATTERN, isCalendarDay, todayIso } from "../day";
import { publicProcedure } from "../index";
import { QUOTE_NOTE_MAX, QUOTE_PLACE_MAX } from "../quote-limits";
import { nextFreeSlug, quoteSlug } from "../slug";
import { parseOrRefuse } from "../validate";

/**
 * Shown to whoever tries to move a slug that is already circulating. A refusal
 * without an explanation reads as a bug, so the reason travels with it.
 */
const SLUG_FROZEN_MESSAGE =
  "A Quote's slug is set from its first Card on first save and cannot change afterwards, because links to it are already circulating. Change the Cards or the Editorial note instead.";

/**
 * A Quote's permalink starts with its Person's slug, so handing the Quote to
 * another Person would break every link to it just as surely as moving it.
 */
const PERSON_FROZEN_MESSAGE =
  "A Quote stays with the Person it was entered under: its permalink begins with that Person's slug, so moving it would break links already circulating.";

/**
 * An optional field the form left blank arrives as an empty string, sometimes
 * with spaces around it. Absence is stored as `null`, and a value is trimmed
 * before its rules run.
 */
function blankToNull(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();

  return trimmed === "" ? null : trimmed;
}

/**
 * Only the shape of the form's payload. The rules, and the words a refusal
 * shows the editor, live in `quoteRules` and are applied in the handler.
 */
const quoteShape = z.object({
  personId: z.string(),
  editorialNote: z.string(),
  date: z.string().nullish(),
  place: z.string().nullish(),
  cards: z.array(z.string()),
});

const quoteRules = z.object({
  personId: z.string().min(1, "Choose the Person this Quote belongs to."),
  editorialNote: z
    .string()
    .trim()
    .min(
      1,
      "An Editorial note is needed: it is the context a reader sees beside the Quote."
    )
    .max(
      QUOTE_NOTE_MAX,
      `An Editorial note is at most ${QUOTE_NOTE_MAX} characters.`
    ),
  date: z.preprocess(
    blankToNull,
    z
      .string()
      .regex(DAY_PATTERN, "A Date is a calendar day, written like 2026-03-20.")
      .refine(isCalendarDay, "That Date is not a day on the calendar.")
      .refine((day) => day <= todayIso(), "A Date cannot be in the future.")
      .nullish()
  ),
  place: z.preprocess(
    blankToNull,
    z
      .string()
      .max(QUOTE_PLACE_MAX, `A Place is at most ${QUOTE_PLACE_MAX} characters.`)
      .nullish()
  ),
  cards: z
    .array(z.string().trim().min(1, "A Card cannot be empty."))
    .min(1, "A Quote needs at least one Card."),
});

function quoteDraft(input: unknown) {
  const draft = parseOrRefuse(quoteRules, input);

  return {
    personId: draft.personId,
    editorialNote: draft.editorialNote,
    date: draft.date ?? null,
    place: draft.place ?? null,
    cards: draft.cards,
  };
}

/** The first free slug for these Cards under one Person: the slug, then `-2`, `-3`, and so on. */
async function availableSlug(
  db: Database,
  personId: string,
  cards: string[]
): Promise<string> {
  const base = quoteSlug(cards[0] ?? "");

  return nextFreeSlug(base, await slugsUnderPerson(db, personId, base));
}

export const quoteRouter = {
  /** The Quote behind `/<person-slug>/<quote-slug>`. No sign-in needed. */
  bySlug: publicProcedure
    .input(
      z.object({
        personSlug: z.string().min(1),
        quoteSlug: z.string().min(1),
      })
    )
    .handler(async ({ context, input }) => {
      const found = await findQuoteForPage(
        context.db,
        input.personSlug,
        input.quoteSlug
      );

      if (!found) {
        throw new ORPCError("NOT_FOUND", {
          message: "No Quote lives at that address.",
        });
      }

      return found;
    }),

  /** Every Quote under one Person, newest first, for the admin list. */
  listForPerson: authedProcedure
    .input(z.object({ personId: z.string().min(1) }))
    .handler(({ context, input }) =>
      listQuotesForPerson(context.db, input.personId)
    ),

  create: authedProcedure
    .input(quoteShape)
    .handler(async ({ context, input }) => {
      const draft = quoteDraft(input);
      const owner = await findPersonById(context.db, draft.personId);

      if (!owner || owner.archivedAt !== null) {
        throw new ORPCError("NOT_FOUND", { message: "No such Person." });
      }

      return insertQuote(context.db, {
        ...draft,
        slug: await availableSlug(context.db, owner.id, draft.cards),
        actorId: context.actor.userId,
      });
    }),

  /**
   * Fixes the Cards, the Editorial note, the Date and the Place. The slug is
   * not among the editable fields: once a permalink has been shared it stays
   * put (ADR-0001), so a client that sends a different one is refused rather
   * than quietly ignored.
   */
  update: authedProcedure
    .input(quoteShape.extend({ id: z.string(), slug: z.string().optional() }))
    .handler(async ({ context, input }) => {
      const existing = await findQuoteById(context.db, input.id);

      if (!existing) {
        throw new ORPCError("NOT_FOUND", { message: "No such Quote." });
      }

      if (input.slug !== undefined && input.slug !== existing.slug) {
        throw new ORPCError("CONFLICT", { message: SLUG_FROZEN_MESSAGE });
      }

      const draft = quoteDraft(input);

      if (draft.personId !== existing.personId) {
        throw new ORPCError("CONFLICT", { message: PERSON_FROZEN_MESSAGE });
      }

      const revised = await reviseQuote(context.db, existing.id, {
        editorialNote: draft.editorialNote,
        date: draft.date,
        place: draft.place,
        cards: draft.cards,
        actorId: context.actor.userId,
      });

      if (!revised) {
        throw new ORPCError("NOT_FOUND", { message: "No such Quote." });
      }

      return revised;
    }),
};
