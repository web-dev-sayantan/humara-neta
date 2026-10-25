import type { Database } from "@humara-neta/db";

import type { Actor } from "./actor";
import { resolveActor } from "./actor";
import type { Auth } from "./auth";

export interface Context {
  db: Database;
  actor: Actor | null;
}

export interface BuildContextInput {
  db: Database;
  auth: Auth;
  headers: Headers;
}

/**
 * The one place the request's identity becomes an actor: Better Auth resolves
 * the session, the allowlist supplies the role, and procedures only ever see
 * `actor`. Tests construct the context directly instead of faking a session.
 */
export async function buildContext({ db, auth, headers }: BuildContextInput): Promise<Context> {
  const session = await auth.api.getSession({ headers });
  const actor = await resolveActor(
    db,
    session ? { userId: session.user.id, email: session.user.email } : null,
  );

  return { db, actor };
}
