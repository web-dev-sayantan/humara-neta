import { ONE_TIME_CODE } from "./one-time-code";
import type { OneTimeCode } from "./one-time-code";

export interface ResendSenderConfig {
  apiKey: string;
  from: string;
  /** Injected so the sender can be exercised without reaching Resend. */
  fetch?: typeof fetch;
}

const RESEND_ENDPOINT = "https://api.resend.com/emails";

const EXPIRES_IN_MINUTES = ONE_TIME_CODE.expiresInSeconds / 60;

/**
 * Sends the sign-in code through Resend. The caller decides *whether* to send:
 * this function only knows how, so a refusal to mail someone never lives here.
 */
export function createResendSender(
  config: ResendSenderConfig
): (code: OneTimeCode) => Promise<void> {
  const send =
    config.fetch ??
    ((input: RequestInfo | URL, init?: RequestInit) =>
      globalThis.fetch(input, init));

  return async ({ email, otp }) => {
    const response = await send(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: config.from,
        to: email,
        subject: "Your humara-neta sign-in code",
        text: `Use this code to sign in: ${otp}\n\nIt expires in ${EXPIRES_IN_MINUTES} minutes. If you didn't ask for it, ignore this message.`,
      }),
    });

    if (!response.ok) {
      throw new Error(`Resend refused the sign-in code (${response.status})`);
    }
  };
}
