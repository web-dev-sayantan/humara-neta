import { ORPCError } from "@orpc/server";

import { o } from "./index";

/**
 * The enforcement point. Hiding a control is not a permission check, so every
 * procedure that mutates content goes through `authedProcedure`, and every
 * administrator-only operation through `adminProcedure`.
 */
const requireActor = o.middleware(async ({ context, next }) => {
  if (context.actor === null) {
    throw new ORPCError("UNAUTHORIZED", { message: "Sign in to continue." });
  }

  return next({ context: { actor: context.actor } });
});

const requireAdministrator = requireActor.concat(async ({ context, next }) => {
  if (context.actor.role !== "admin") {
    throw new ORPCError("FORBIDDEN", {
      message: "Only administrators can do that.",
    });
  }

  return next();
});

/** For anyone on the allowlist. */
export const authedProcedure = o.use(requireActor);

/** For administrators: curation, archiving, and the methodology page. */
export const adminProcedure = o.use(requireAdministrator);
