import { createRouterClient } from "@orpc/server";
import { describe, expect, it } from "vitest";

import { adminProcedure } from "../src/authorize";
import { createTestHarness } from "./harness";

/**
 * `adminProcedure` is the single administrator-only guard; no administrator-only
 * procedure lives in the router yet, so the guard is exercised through a router
 * of its own built from the same middleware and called at the same seam.
 */
const administratorOnlyRouter = {
  administratorOnly: adminProcedure.handler(() => "done"),
};

describe("the actor seam", () => {
  it("refuses a procedure that needs an actor when nobody is signed in", async () => {
    const harness = await createTestHarness();

    await expect(harness.clientFor(null).admin.me()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("tells the admin shell who is signed in and what role they hold", async () => {
    const harness = await createTestHarness();
    const userId = await harness.addUser({
      name: "Ada Lovelace",
      email: "ada@example.com",
    });

    const viewer = await harness
      .clientFor({ userId, role: "editor" })
      .admin.me();

    expect(viewer).toEqual({
      name: "Ada Lovelace",
      email: "ada@example.com",
      role: "editor",
    });
  });

  it("refuses an editor an administrator-only operation", async () => {
    const harness = await createTestHarness();
    const client = createRouterClient(administratorOnlyRouter, {
      context: {
        db: harness.db,
        actor: { userId: "user_editor", role: "editor" },
      },
    });

    await expect(client.administratorOnly()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("allows an administrator an administrator-only operation", async () => {
    const harness = await createTestHarness();
    const client = createRouterClient(administratorOnlyRouter, {
      context: {
        db: harness.db,
        actor: { userId: "user_admin", role: "admin" },
      },
    });

    await expect(client.administratorOnly()).resolves.toBe("done");
  });
});
