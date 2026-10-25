import {
  type FailureCode,
  INVALID_ONE_TIME_CODE,
  NOT_ALLOWLISTED,
  NOT_ALLOWLISTED_MESSAGE,
  ONE_TIME_CODE_EXPIRED,
  TOO_MANY_ONE_TIME_CODE_ATTEMPTS,
} from "@humara-neta/api/refusal";

/** Copy for a sign-in that failed for a reason we do not have words for. */
export const GENERIC_SIGN_IN_FAILURE = "Sign-in didn't finish. Please try again.";

const FAILURE_MESSAGES = {
  [NOT_ALLOWLISTED]: NOT_ALLOWLISTED_MESSAGE,
  [INVALID_ONE_TIME_CODE]: "That code didn't match. Check the six digits and try again.",
  [ONE_TIME_CODE_EXPIRED]: "That code has expired. Ask for a new one.",
  [TOO_MANY_ONE_TIME_CODE_ATTEMPTS]: "Too many wrong codes. Ask for a new one, then use that.",
} satisfies Record<FailureCode, string>;

/** Narrows an arbitrary code from the wire to one the screen has words for. */
function isFailureCode(code: string): code is FailureCode {
  return Object.hasOwn(FAILURE_MESSAGES, code);
}

/** The words the sign-in screen shows for the code Better Auth refused with. */
export function failureMessage(code: string | undefined): string {
  return code !== undefined && isFailureCode(code)
    ? FAILURE_MESSAGES[code]
    : GENERIC_SIGN_IN_FAILURE;
}
