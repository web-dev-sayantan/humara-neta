/**
 * Shared with the sign-in screen. Kept free of server imports so the browser
 * bundle only pulls the code and the words.
 */

/** Machine-readable refusal code, surfaced to the sign-in screen. */
export const NOT_ALLOWLISTED = "not_allowlisted";

/** Calm copy for a refused sign-in: explains, does not scold. */
export const NOT_ALLOWLISTED_MESSAGE =
  "That email address isn't on the list for this site. If you should have access, ask an administrator to add it.";
