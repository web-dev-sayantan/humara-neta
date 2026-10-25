import { eq } from "drizzle-orm";

import type { Database } from "./index";
import { user } from "./schema/auth";

export type AuthUser = Pick<typeof user.$inferSelect, "id" | "name" | "email">;

/** The auth user a session belongs to, for display and audit stamps. */
export async function findAuthUser(
  db: Database,
  userId: string
): Promise<AuthUser | null> {
  const [row] = await db
    .select({ id: user.id, name: user.name, email: user.email })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  return row ?? null;
}
