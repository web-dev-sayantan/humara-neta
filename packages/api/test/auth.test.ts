import * as schema from "@humara-neta/db/schema/index";
import { describe, expect, it, vi } from "vitest";

import { NOT_ALLOWLISTED } from "../src/refusal";
import { type TestHarness, createTestHarness } from "./harness";

const FIVE_MINUTES_MS = 5 * 60 * 1000;

/** A code that is certainly not the one that was sent. */
function wrongCode(otp: string): string {
  return otp === "000000" ? "000001" : "000000";
}

async function signInWithCode(harness: TestHarness, email: string, otp: string) {
  return harness.auth.api.signInEmailOTP({ body: { email, otp } });
}

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

  it("sends a six-digit code that is kept for five minutes", async () => {
    const harness = await createTestHarness();
    await harness.allow("ada@example.com", "admin");

    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      vi.setSystemTime(new Date("2026-03-20T09:00:00Z"));
      const otp = await harness.requestOtp("ada@example.com");

      expect(otp).toMatch(/^\d{6}$/);

      const [stored] = await harness.db.select().from(schema.verification);
      expect(stored?.expiresAt.getTime()).toBe(
        Date.parse("2026-03-20T09:00:00Z") + FIVE_MINUTES_MS,
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not keep the code in plain text where the database can be read", async () => {
    const harness = await createTestHarness();
    await harness.allow("ada@example.com", "admin");

    const otp = await harness.requestOtp("ada@example.com");
    const [stored] = await harness.db.select().from(schema.verification);

    expect(stored?.value).not.toContain(otp);
  });

  it("refuses a wrong code without creating a session, and still accepts the right one", async () => {
    const harness = await createTestHarness();
    await harness.allow("ada@example.com", "admin");
    const otp = await harness.requestOtp("ada@example.com");

    await expect(signInWithCode(harness, "ada@example.com", wrongCode(otp))).rejects.toMatchObject({
      status: "BAD_REQUEST",
      body: { code: "INVALID_OTP" },
    });
    expect(await countAuthRows(harness)).toEqual({ users: 0, sessions: 0, accounts: 0 });

    const context = await harness.contextFrom(await harness.signIn("ada@example.com"));
    expect(context.actor?.role).toBe("admin");
  });

  it("refuses an expired code without creating a session", async () => {
    const harness = await createTestHarness();
    await harness.allow("ada@example.com", "admin");

    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      vi.setSystemTime(new Date("2026-03-20T09:00:00Z"));
      const otp = await harness.requestOtp("ada@example.com");

      vi.setSystemTime(new Date("2026-03-20T09:05:01Z"));
      await expect(signInWithCode(harness, "ada@example.com", otp)).rejects.toMatchObject({
        status: "BAD_REQUEST",
        body: { code: "OTP_EXPIRED" },
      });

      expect(await countAuthRows(harness)).toEqual({ users: 0, sessions: 0, accounts: 0 });
    } finally {
      vi.useRealTimers();
    }
  });

  it("refuses the right code once it has been guessed wrong three times", async () => {
    const harness = await createTestHarness();
    await harness.allow("ada@example.com", "admin");
    const otp = await harness.requestOtp("ada@example.com");

    const guessWrong = () =>
      expect(signInWithCode(harness, "ada@example.com", wrongCode(otp))).rejects.toMatchObject({
        status: "BAD_REQUEST",
        body: { code: "INVALID_OTP" },
      });

    await guessWrong();
    await guessWrong();
    await guessWrong();

    await expect(signInWithCode(harness, "ada@example.com", otp)).rejects.toMatchObject({
      status: "FORBIDDEN",
      body: { code: "TOO_MANY_ATTEMPTS" },
    });
    expect(await countAuthRows(harness)).toEqual({ users: 0, sessions: 0, accounts: 0 });
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

  it("refuses a Google sign-in for an address that is not on the allowlist, and creates nothing", async () => {
    const harness = await createTestHarness();

    await expect(harness.signInWithGoogle("mallory@example.com")).rejects.toMatchObject({
      status: "FORBIDDEN",
      body: { code: NOT_ALLOWLISTED },
    });

    expect(await countAuthRows(harness)).toEqual({ users: 0, sessions: 0, accounts: 0 });
  });

  it("resolves one user for an address that signs in by code and then by Google", async () => {
    const harness = await createTestHarness();
    await harness.allow("ada@example.com", "admin");

    const byCode = await harness.contextFrom(await harness.signIn("ada@example.com"));
    const byGoogle = await harness.contextFrom(await harness.signInWithGoogle("ada@example.com"));

    expect(byGoogle.actor?.userId).toBe(byCode.actor?.userId);
    expect(await countAuthRows(harness)).toEqual({ users: 1, sessions: 2, accounts: 1 });
  });

  it("resolves one user for an address that signs in by Google and then by code", async () => {
    const harness = await createTestHarness();
    await harness.allow("ada@example.com", "editor");

    const byGoogle = await harness.contextFrom(await harness.signInWithGoogle("ada@example.com"));
    const byCode = await harness.contextFrom(await harness.signIn("ada@example.com"));

    expect(byCode.actor?.userId).toBe(byGoogle.actor?.userId);
    expect(byCode.actor?.role).toBe("editor");
    expect(await countAuthRows(harness)).toEqual({ users: 1, sessions: 2, accounts: 1 });
  });

  it("resolves no actor for a request that carries no session", async () => {
    const harness = await createTestHarness();

    expect(await harness.contextFrom(new Headers())).toMatchObject({
      actor: null,
    });
  });
});
