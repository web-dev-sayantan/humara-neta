/**
 * How much text a Quote's fields take, shared by the procedure that validates
 * them and the form that caps them. Kept free of server imports so the browser
 * bundle only pulls the numbers, as `person-limits.ts` does.
 */

/**
 * A Card is a square screenshot, not a page: past this the type has to shrink
 * so far that the words stop being readable. The form warns at this length but
 * still saves, because a long quote must never be silently cut.
 */
export const CARD_TEXT_WARN = 280;

/** Context, not an essay: a paragraph or two beside the Quote. */
export const QUOTE_NOTE_MAX = 1200;

/** A Place is a name: a city, a venue, or both. */
export const QUOTE_PLACE_MAX = 120;
