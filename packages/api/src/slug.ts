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

/** Long enough to say what the Quote opens with; short enough to be a link. */
const QUOTE_SLUG_MAX = 60;

/**
 * The last segment of a Quote's permalink, taken from the opening words of its
 * first Card. Whole words only, so the slug never ends mid-word, and never
 * empty: text with nothing usable in it yields `quote`, and the caller adds a
 * number when that is taken.
 */
export function quoteSlug(cardText: string): string {
  const kept: string[] = [];
  let length = 0;

  for (const word of slugify(cardText).split("-")) {
    if (word === "") {
      continue;
    }

    const next = length === 0 ? word.length : length + 1 + word.length;
    if (next > QUOTE_SLUG_MAX) {
      break;
    }

    kept.push(word);
    length = next;
  }

  return kept.join("-") || "quote";
}

/**
 * The first free slug for `base`, numbering later collisions: `base`, `base-2`,
 * `base-3`. `taken` holds the slugs already in use in the same space — every
 * Person's page, or one Person's Quotes.
 */
export function nextFreeSlug(base: string, taken: Iterable<string>): string {
  const used = new Set(taken);

  let slug = base;
  let suffix = 2;
  while (used.has(slug)) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }

  return slug;
}
