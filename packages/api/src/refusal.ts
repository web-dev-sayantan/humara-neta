/**
 * Shared with the sign-in screen. Kept free of server imports so the browser
 * bundle only pulls the code and the words.
 */

/** Machine-readable refusal code, surfaced to the sign-in screen. */
export const NOT_ALLOWLISTED = "not_allowlisted";

/** Calm copy for a refused sign-in: explains, does not scold. */
export const NOT_ALLOWLISTED_MESSAGE =
  "That email address isn't on the list for this site. If you should have access, ask an administrator to add it.";

/** Better Auth's codes for a one-time code that did not sign anyone in. */
export const INVALID_ONE_TIME_CODE = "INVALID_OTP";
export const ONE_TIME_CODE_EXPIRED = "OTP_EXPIRED";
export const TOO_MANY_ONE_TIME_CODE_ATTEMPTS = "TOO_MANY_ATTEMPTS";

/** Every refusal the sign-in screen has words for. */
export type FailureCode =
  | typeof NOT_ALLOWLISTED
  | typeof INVALID_ONE_TIME_CODE
  | typeof ONE_TIME_CODE_EXPIRED
  | typeof TOO_MANY_ONE_TIME_CODE_ATTEMPTS;
