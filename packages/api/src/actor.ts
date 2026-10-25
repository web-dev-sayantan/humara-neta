import type { Database } from "@humara-neta/db";
import { findAllowlistRole } from "@humara-neta/db/allowlist";
import type { Role } from "@humara-neta/db/schema/allowlist";

export type { Role };

/** Who is making the request: the auth user id plus the role their allowlist row grants. */
export interface Actor {
  userId: string;
  role: Role;
}

/** The identity Better Auth resolved from the request, before the allowlist is consulted. */
export interface Identity {
  userId: string;
  email: string;
}

/**
 * Turns a signed-in identity into an actor, or `null` when the email has no
 * allowlist row. Resolved once per request, in the context builder.
 */
export async function resolveActor(
  db: Database,
  identity: Identity | null
): Promise<Actor | null> {
  if (!identity) {
    return null;
  }

  const role = await findAllowlistRole(db, identity.email);

  return role ? { userId: identity.userId, role } : null;
}
