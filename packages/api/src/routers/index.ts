import type { RouterClient } from "@orpc/server";

import { publicProcedure } from "../index";
import { adminRouter } from "./admin";
import { personRouter } from "./person";
import { quoteRouter } from "./quote";

export const appRouter = {
  healthCheck: publicProcedure.handler(() => "OK"),
  admin: adminRouter,
  person: personRouter,
  quote: quoteRouter,
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
