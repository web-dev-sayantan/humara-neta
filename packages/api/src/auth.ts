import type { Database } from "@humara-neta/db";
import { findAllowlistRole } from "@humara-neta/db/allowlist";
import { findAuthUser } from "@humara-neta/db/users";
import * as schema from "@humara-neta/db/schema/index";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { emailOTP } from "better-auth/plugins/email-otp";

import { NOT_ALLOWLISTED, NOT_ALLOWLISTED_MESSAGE } from "./refusal";

const ONE_TIME_CODE_PATH = "/email-otp/send-verification-otp";

export interface AuthConfig {
  db: Database;
  secret: string;
  baseURL: string;
  google: { clientId: string; clientSecret: string };
  sendVerificationOTP: (input: { email: string; otp: string }) => Promise<void>;
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
 *   pointless mail is sent either.
 *
 * Both checks read the same allowlist row. Nothing in the application writes it.
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
    plugins: [
      emailOTP({
        sendVerificationOTP: ({ email, otp }) => config.sendVerificationOTP({ email, otp }),
      }),
    ],
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path !== ONE_TIME_CODE_PATH) {
          return;
        }

        const email = typeof ctx.body?.email === "string" ? ctx.body.email : null;
        await refuseUnlessAllowlisted(email);
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
