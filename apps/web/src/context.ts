import { buildContext } from "@humara-neta/api/context";
import type { Context as ApiContext } from "@humara-neta/api/context";

import { getAuth, getDb } from "./services";

export async function createContext({
  req,
}: {
  req: Request;
}): Promise<ApiContext> {
  const db = getDb();

  return buildContext({ db, auth: getAuth(), headers: req.headers });
}

export type Context = Awaited<ReturnType<typeof createContext>>;
