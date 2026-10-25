import { ORPCError } from "@orpc/server";
import type { z } from "zod";

/**
 * Parses the values a form sent and refuses with the first rule's own wording.
 *
 * oRPC's built-in validation answers every failure with the same sentence
 * ("Input validation failed") and hides the rule's message in `data.issues`,
 * which is no use to the editor reading the form. Procedures therefore declare
 * only the shape of their input and apply the rules here, where the message
 * can travel back to the screen that shows it.
 */
export function parseOrRefuse<Schema extends z.ZodType>(
  schema: Schema,
  input: unknown
): z.output<Schema> {
  const result = schema.safeParse(input);

  if (!result.success) {
    throw new ORPCError("BAD_REQUEST", {
      message:
        result.error.issues[0]?.message ??
        "That is not something this page can save.",
    });
  }

  return result.data;
}
