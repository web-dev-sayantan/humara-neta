import { findAuthUser } from "@humara-neta/db/users";
import { ORPCError } from "@orpc/server";

import { authedProcedure } from "../authorize";

export const adminRouter = {
  /** What the admin shell needs to name the person signed in. */
  me: authedProcedure.handler(async ({ context }) => {
    const user = await findAuthUser(context.db, context.actor.userId);

    if (!user) {
      throw new ORPCError("UNAUTHORIZED", { message: "Sign in to continue." });
    }

    return { name: user.name, email: user.email, role: context.actor.role };
  }),
};
