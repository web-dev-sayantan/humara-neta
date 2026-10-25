import type { RouterClient } from "@orpc/server";

import { publicProcedure } from "../index";
import { adminRouter } from "./admin";
import { personRouter } from "./person";

export const appRouter = {
  healthCheck: publicProcedure.handler(() => "OK"),
  admin: adminRouter,
  person: personRouter,
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
