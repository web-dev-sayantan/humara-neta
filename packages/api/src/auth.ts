import type { Database } from "@humara-neta/db";
import { findAllowlistRole } from "@humara-neta/db/allowlist";
import * as schema from "@humara-neta/db/schema/index";
import { findAuthUser } from "@humara-neta/db/users";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { emailOTP } from "better-auth/plugins/email-otp";
import type { GoogleOptions } from "better-auth/social-providers";

import { ONE_TIME_CODE } from "./one-time-code";
import type { OneTimeCode } from "./one-time-code";
import { NOT_ALLOWLISTED, NOT_ALLOWLISTED_MESSAGE } from "./refusal";

/**
 * Every Better Auth path that mails a one-time code, and the body field naming
 * the recipient. All of them are gated: a de-allowlisted address keeps its
 * `user` row for audit stamps, so a password-reset path would otherwise mail
 * someone whose access has been removed.
 */
const MAILING_PATHS = new Map<string, "email" | "newEmail">([
  ["/email-otp/send-verification-otp", "email"],
  ["/email-otp/request-password-reset", "email"],
  ["/forget-password/email-otp", "email"],
  ["/email-otp/request-email-change", "newEmail"],
]);

export interface AuthConfig {
  db: Database;
  secret: string;
  baseURL: string;
  google: GoogleOptions;
  sendVerificationOTP: (input: OneTimeCode) => Promise<void>;
}

/**
 * Better Auth, gated by the allowlist before a user exists.
 *
 * Authorisation starts here because every provider creates a user on first use:
 * - `user.create.before` refuses to create the row, so Google and the one-time
 *   code both fail for an email that is not on the allowlist;
 * - `session.create.before` refuses a session for an address whose allowlist row
 *   has since been removed, so revocation does not need their user row deleted;
 * - the request hook refuses to mint a one-time code for such an email, so no
 *   pointless mail is sent either — on any of the paths that send one.
 *
 * Both checks read the same allowlist row. Nothing in the application writes it.
 *
 * Accounts are linked by verified email, so signing in by code and by Google
 * with the same address keeps one `user` row — and one set of `created_by` /
 * `updated_by` stamps.
 */
export function createAuth(config: AuthConfig) {
  const refuseUnlessAllowlisted = async (email: string | null | undefined) => {
    const role = email ? await findAllowlistRole(config.db, email) : null;

    if (!role) {
      throw new APIError("FORBIDDEN", {
        code: NOT_ALLOWLISTED,
        message: NOT_ALLOWLISTED_MESSAGE,
      });
    }
  };

  return betterAuth({
    appName: "humara-neta",
    baseURL: config.baseURL,
    secret: config.secret,
    database: drizzleAdapter(config.db, { provider: "sqlite", schema }),
    socialProviders: { google: config.google },
    account: {
      accountLinking: { enabled: true },
    },
    plugins: [
      emailOTP({
        otpLength: ONE_TIME_CODE.length,
        expiresIn: ONE_TIME_CODE.expiresInSeconds,
        allowedAttempts: ONE_TIME_CODE.allowedAttempts,
        // A code at rest is a credential: keep a digest, never the digits.
        storeOTP: "hashed",
        sendVerificationOTP: config.sendVerificationOTP,
      }),
    ],
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        const recipientField = MAILING_PATHS.get(ctx.path);

        if (!recipientField) {
          return;
        }

        const recipient: unknown = ctx.body?.[recipientField];
        await refuseUnlessAllowlisted(
          typeof recipient === "string" ? recipient : null
        );
      }),
    },
    databaseHooks: {
      user: {
        create: {
          before: async (newUser) => {
            await refuseUnlessAllowlisted(newUser.email);
            return { data: newUser };
          },
        },
      },
      session: {
        create: {
          before: async (newSession) => {
            const user = await findAuthUser(config.db, newSession.userId);
            await refuseUnlessAllowlisted(user?.email);
            return { data: newSession };
          },
        },
      },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;
