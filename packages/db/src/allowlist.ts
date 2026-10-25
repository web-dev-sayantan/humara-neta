import { eq, sql } from "drizzle-orm";

import type { Database } from "./index";
import { allowlist } from "./schema/allowlist";
import type { Role } from "./schema/allowlist";

/** Allowlist emails are compared lower-case, so rows written by hand still match. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * The role the allowlist grants an email address, or `null` when the address is
 * not on it. Reads only: the application never writes to the allowlist.
 */
export async function findAllowlistRole(
  db: Database,
  email: string
): Promise<Role | null> {
  const [row] = await db
    .select({ role: allowlist.role })
    .from(allowlist)
    .where(eq(sql`lower(${allowlist.email})`, normalizeEmail(email)))
    .limit(1);

  return row?.role ?? null;
}
