import * as schema from "@humara-neta/db/schema/index";
import { describe, expect, it } from "vitest";

import { NOT_ALLOWLISTED } from "../src/refusal";
import { type TestHarness, createTestHarness } from "./harness";

async function countAuthRows(harness: TestHarness) {
  const [users, sessions, accounts] = await Promise.all([
    harness.db.select().from(schema.user),
    harness.db.select().from(schema.session),
    harness.db.select().from(schema.account),
  ]);
  return {
    users: users.length,
    sessions: sessions.length,
    accounts: accounts.length,
  };
}

describe("allowlist-gated sign-in", () => {
  it("signs an allowlisted person in and resolves their role into the actor", async () => {
    const harness = await createTestHarness();
    await harness.allow("ada@example.com", "admin");

    const context = await harness.contextFrom(await harness.signIn("ada@example.com"));

    expect(context.actor?.role).toBe("admin");
    expect(context.actor?.userId).toEqual(expect.any(String));
    expect(await countAuthRows(harness)).toEqual({
      users: 1,
      sessions: 1,
      accounts: 0,
    });
  });

  it("takes the role from the allowlist, so an editor signs in as an editor", async () => {
    const harness = await createTestHarness();
    await harness.allow("editor@example.com", "editor");

    const context = await harness.contextFrom(await harness.signIn("editor@example.com"));

    expect(context.actor?.role).toBe("editor");
  });

  it("matches an allowlist row written in mixed case", async () => {
    const harness = await createTestHarness();
    await harness.allow("Ada@Example.com", "admin");

    const context = await harness.contextFrom(await harness.signIn("ada@example.com"));

    expect(context.actor?.role).toBe("admin");
  });

  it("refuses a one-time code to an email that is not on the allowlist, and creates nothing", async () => {
    const harness = await createTestHarness();

    await expect(harness.requestOtp("mallory@example.com")).rejects.toMatchObject({
      status: "FORBIDDEN",
      body: { code: NOT_ALLOWLISTED },
    });

    expect(harness.sentOTPs).toHaveLength(0);
    expect(await countAuthRows(harness)).toEqual({
      users: 0,
      sessions: 0,
      accounts: 0,
    });
    expect(await harness.db.select().from(schema.verification)).toHaveLength(0);
  });

  it("refuses to create an account for a non-allowlisted email even when a valid code is presented", async () => {
    const harness = await createTestHarness();
    const otp = await harness.auth.api.createVerificationOTP({
      body: { email: "mallory@example.com", type: "sign-in" },
    });

    await expect(
      harness.auth.api.signInEmailOTP({
        body: { email: "mallory@example.com", otp },
      }),
    ).rejects.toMatchObject({ status: "FORBIDDEN" });

    expect(await countAuthRows(harness)).toEqual({
      users: 0,
      sessions: 0,
      accounts: 0,
    });
  });

  it("stops a signed-in person acting, and stops them signing in again, once their allowlist row is removed", async () => {
    const harness = await createTestHarness();
    await harness.allow("ada@example.com", "editor");
    const headers = await harness.signIn("ada@example.com");

    await harness.db.delete(schema.allowlist);

    expect((await harness.contextFrom(headers)).actor).toBeNull();

    const otp = await harness.auth.api.createVerificationOTP({
      body: { email: "ada@example.com", type: "sign-in" },
    });

    await expect(
      harness.auth.api.signInEmailOTP({ body: { email: "ada@example.com", otp } }),
    ).rejects.toMatchObject({ status: "FORBIDDEN" });

    expect(await countAuthRows(harness)).toEqual({ users: 1, sessions: 1, accounts: 0 });
  });

  it("resolves no actor for a request that carries no session", async () => {
    const harness = await createTestHarness();

    expect(await harness.contextFrom(new Headers())).toMatchObject({
      actor: null,
    });
  });
});
