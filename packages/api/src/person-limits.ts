/**
 * How much text a Person's fields take, shared by the procedure that validates
 * them and the form that caps them. Kept free of server imports so the browser
 * bundle only pulls the numbers, as `refusal.ts` does for its words.
 */

/** Long enough for a full name with honorifics; short enough to stay a heading. */
export const PERSON_NAME_MAX = 120;

/** A short bio is a sentence or two, not a biography. */
export const PERSON_BIO_MAX = 600;
