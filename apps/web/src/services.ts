import { type Database, createDb } from "@humara-neta/db";

import { ENV } from "./env.server";

export function getDb(): Database {
  return createDb(ENV);
}
