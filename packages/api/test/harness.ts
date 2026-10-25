import { createDb } from "@humara-neta/db";
import { migrateToLatest } from "@humara-neta/db/migrate";
import * as schema from "@humara-neta/db/schema/index";
import type { RouterClient } from "@orpc/server";
import { createRouterClient } from "@orpc/server";

import type { Actor, Role } from "../src/actor";
import { createAuth } from "../src/auth";
import { buildContext } from "../src/context";
import type { Context } from "../src/context";
import { appRouter } from "../src/routers/index";

export interface SentOTP {
  email: string;
  otp: string;
}

/** A Google profile shaped like a decoded ID token, without reaching Google. */
function googleIdToken({
  email,
  name,
}: {
  email: string;
  name: string;
}): string {
  const claims = { sub: `google-${email}`, email, email_verified: true, name };
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  return `header.${payload}.signature`;
}

/**
 * The test seam: a throwaway libSQL database of its own, migrated, plus a
 * router client whose context is constructed directly. Identity is never
 * resolved from an HTTP request here — that is the point of the actor seam.
 */
export async function createTestHarness() {
  const db = createDb({ DATABASE_URL: ":memory:", DATABASE_AUTH_TOKEN: "" });
  await migrateToLatest(db);

  const sentOTPs: SentOTP[] = [];
  const auth = createAuth({
    db,
    secret: "humara-neta-test-secret-000000000000",
    baseURL: "http://localhost:3005",
    google: {
      clientId: "google-client-id",
      clientSecret: "google-client-secret",
      // Tests never reach Google: the signature is not what this suite checks.
      verifyIdToken: async () => true,
    },
    sendVerificationOTP: async ({ email, otp }) => {
      sentOTPs.push({ email, otp });
    },
  });

  async function allow(email: string, role: Role) {
    await db.insert(schema.allowlist).values({ email, role });
  }

  async function addUser({ name, email }: { name: string; email: string }) {
    const id = `user_${crypto.randomUUID()}`;
    const now = new Date();
    await db.insert(schema.user).values({
      id,
      name,
      email,
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
    });
    return id;
  }

  function clientFor(actor: Actor | null): RouterClient<typeof appRouter> {
    const context: Context = { db, actor };
    return createRouterClient(appRouter, { context });
  }

  async function requestOtp(email: string) {
    await auth.api.sendVerificationOTP({ body: { email, type: "sign-in" } });
    const sent = sentOTPs.at(-1);
    if (!sent) {
      throw new Error("No one-time code was sent");
    }
    return sent.otp;
  }

  function headersWithCookie(setCookie: string | null) {
    const cookie = setCookie?.split(";")[0] ?? "";
    return new Headers({ cookie });
  }

  /** Signs in with a one-time code and returns request headers carrying the session. */
  async function signIn(email: string) {
    const otp = await requestOtp(email);
    const { headers } = await auth.api.signInEmailOTP({
      body: { email, otp },
      returnHeaders: true,
    });
    return headersWithCookie(headers.get("set-cookie"));
  }

  /**
   * Signs in with a Google identity for `email`, through Better Auth's ID-token
   * path. The profile is real to Better Auth; only Google's signature check is
   * stubbed, so the linking rules run for real.
   */
  async function signInWithGoogle(email: string) {
    const { headers } = await auth.api.signInSocial({
      body: {
        provider: "google",
        idToken: { token: googleIdToken({ email, name: "Ada Lovelace" }) },
        callbackURL: "/admin",
      },
      returnHeaders: true,
    });
    return headersWithCookie(headers.get("set-cookie"));
  }

  function contextFrom(headers: Headers) {
    return buildContext({ db, auth, headers });
  }

  return {
    db,
    auth,
    sentOTPs,
    allow,
    addUser,
    clientFor,
    requestOtp,
    signIn,
    signInWithGoogle,
    contextFrom,
  };
}

export type TestHarness = Awaited<ReturnType<typeof createTestHarness>>;
