import type { RouterClient } from "@orpc/server";

import { publicProcedure } from "../index";
import { adminRouter } from "./admin";

export const appRouter = {
  healthCheck: publicProcedure.handler(() => "OK"),
  admin: adminRouter,
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
