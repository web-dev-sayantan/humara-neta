/**
 * The URL a Person's page lives at, derived from the words an editor typed:
 * lower-case ASCII words separated by single hyphens. Initials keep a separator
 * each ("A. P. J. Abdul Kalam" → `a-p-j-abdul-kalam`) and accents are folded
 * ("Amílcar Cabral" → `amilcar-cabral`), because a slug is a link, not a
 * spelling. Text with nothing usable left in it yields an empty string, and the
 * caller picks a stand-in.
 */
export function slugify(text: string): string {
  return text
    .normalize("NFKD")
    .replaceAll(/[\u0300-\u036F]/gu, "")
    .toLowerCase()
    .replaceAll(/['’]/gu, "")
    .replaceAll(".", "")
    .replaceAll(/[^a-z0-9]+/gu, "-")
    .replaceAll(/^-+|-+$/gu, "");
}
