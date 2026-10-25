/**
 * The shape of a one-time code: how long it is, how long it lives, and how many
 * guesses it allows. Five minutes matches the wording of the email; three
 * guesses is long enough for a typo and useless to someone guessing.
 */
export const ONE_TIME_CODE = {
  length: 6,
  expiresInSeconds: 5 * 60,
  allowedAttempts: 3,
} as const;

/** What the mailer is handed; it needs the address and the digits, nothing else. */
export interface OneTimeCode {
  email: string;
  otp: string;
}
