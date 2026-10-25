import type { Database } from "@humara-neta/db";
import {
  findPersonById,
  findPersonBySlug,
  insertPerson,
  listPersons,
  revisePerson,
  slugsUnder,
} from "@humara-neta/db/persons";
import { ORPCError } from "@orpc/server";
import { z } from "zod";

import { authedProcedure } from "../authorize";
import { publicProcedure } from "../index";
import { PERSON_BIO_MAX, PERSON_NAME_MAX } from "../person-limits";
import { slugify } from "../slug";

/**
 * Shown to whoever tries to move a slug that is already circulating. A refusal
 * without an explanation reads as a bug, so the reason travels with it.
 */
const SLUG_FROZEN_MESSAGE =
  "A Person's slug is set from their name on first save and cannot change afterwards, because links to it are already circulating. Change the name or the bio instead.";

const personDraft = z.object({
  name: z.string().trim().min(1, "A Person needs a name.").max(PERSON_NAME_MAX),
  bio: z.string().trim().max(PERSON_BIO_MAX).nullish(),
});

/** Trimmed bio, or `null` for one an editor left empty. */
function bioOrNull(bio: string | null | undefined): string | null {
  return bio ? bio.trim() || null : null;
}

/** The first free slug for `name`: the name itself, then `-2`, `-3`, and so on. */
async function availableSlug(db: Database, name: string): Promise<string> {
  const base = slugify(name) || "person";
  const taken = new Set(await slugsUnder(db, base));

  let slug = base;
  let suffix = 2;
  while (taken.has(slug)) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }

  return slug;
}

export const personRouter = {
  /** Every Person with a public page, ordered by name. No sign-in needed. */
  list: publicProcedure.handler(({ context }) => listPersons(context.db)),

  /** The Person whose page lives at `slug`. No sign-in needed. */
  bySlug: publicProcedure
    .input(z.object({ slug: z.string().min(1) }))
    .handler(async ({ context, input }) => {
      const found = await findPersonBySlug(context.db, input.slug);

      if (!found) {
        throw new ORPCError("NOT_FOUND", {
          message: "No Person lives at that slug.",
        });
      }

      return found;
    }),

  create: authedProcedure
    .input(personDraft)
    .handler(async ({ context, input }) =>
      insertPerson(context.db, {
        name: input.name,
        bio: bioOrNull(input.bio),
        slug: await availableSlug(context.db, input.name),
        actorId: context.actor.userId,
      })
    ),

  /**
   * Fixes a name, a bio, or both. The slug is not among the editable fields:
   * once a page has been shared, its slug stays put (ADR-0001), so a client
   * that sends a different one is refused rather than quietly ignored.
   */
  update: authedProcedure
    .input(
      personDraft.extend({ id: z.string().min(1), slug: z.string().optional() })
    )
    .handler(async ({ context, input }) => {
      const existing = await findPersonById(context.db, input.id);

      if (!existing) {
        throw new ORPCError("NOT_FOUND", { message: "No such Person." });
      }

      if (input.slug !== undefined && input.slug !== existing.slug) {
        throw new ORPCError("CONFLICT", { message: SLUG_FROZEN_MESSAGE });
      }

      const revised = await revisePerson(context.db, input.id, {
        name: input.name,
        bio: bioOrNull(input.bio),
        actorId: context.actor.userId,
      });

      if (!revised) {
        throw new ORPCError("NOT_FOUND", { message: "No such Person." });
      }

      return revised;
    }),
};
