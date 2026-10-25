import { createAuth } from "@humara-neta/api/auth";
import type { Auth } from "@humara-neta/api/auth";
import { createDb } from "@humara-neta/db";
import type { Database } from "@humara-neta/db";

import { ENV } from "./env.server";

export function getDb(): Database {
  return createDb(ENV);
}

async function sendOneTimeCode({ email, otp }: { email: string; otp: string }) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ENV.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: ENV.EMAIL_FROM,
      to: email,
      subject: "Your humara-neta sign-in code",
      text: `Use this code to sign in: ${otp}\n\nIt expires in five minutes. If you didn't ask for it, ignore this message.`,
    }),
  });

  if (!response.ok) {
    throw new Error(`Resend refused the sign-in code (${response.status})`);
  }
}

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
