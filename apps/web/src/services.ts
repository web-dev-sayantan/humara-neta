import { createAuth } from "@humara-neta/api/auth";
import type { Auth } from "@humara-neta/api/auth";
import { createResendSender } from "@humara-neta/api/email";
import { createDb } from "@humara-neta/db";
import type { Database } from "@humara-neta/db";

import { ENV } from "./env.server";

export function getDb(): Database {
  return createDb(ENV);
}

const sendOneTimeCode = createResendSender({
  apiKey: ENV.RESEND_API_KEY,
  from: ENV.EMAIL_FROM,
});

let auth: Auth | undefined;

export function getAuth(): Auth {
  auth ??= createAuth({
    db: getDb(),
    secret: ENV.BETTER_AUTH_SECRET,
    baseURL: ENV.BETTER_AUTH_URL,
    google: {
      clientId: ENV.GOOGLE_CLIENT_ID,
      clientSecret: ENV.GOOGLE_CLIENT_SECRET,
    },
    sendVerificationOTP: sendOneTimeCode,
  });

  return auth;
}
