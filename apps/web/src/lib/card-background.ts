/**
 * A background the Card composites a quote over. Photos are hotlinked from
 * Unsplash under the Unsplash License (free for commercial and non-commercial
 * use, no permission or attribution required); the URLs carry Unsplash's own
 * Imgix parameters, which is the form their guidelines ask for.
 */
export interface CardBackground {
  /** The `photo-…` name of the image on `images.unsplash.com`. */
  photoId: string;
  /** What a reader who cannot see it should be told the picture is. */
  description: string;
}

/**
 * The fixed set a Quote with no background of its own is drawn from. They are
 * chosen for what text does over them rather than for what they depict: quiet
 * passages of sky, water and stone that survive a scrim in either theme.
 */
export const CARD_BACKGROUNDS: readonly CardBackground[] = [
  {
    photoId: "1517685352821-92cf88aee5a5",
    description: "Sunlit cumulus cloud, filling the frame",
  },
  {
    photoId: "1518837695005-2083093ee35b",
    description: "The surface of dark green water in long swells",
  },
  {
    photoId: "1500534623283-312aade485b7",
    description: "Low sun above a ridge of dark hills",
  },
  {
    photoId: "1519681393784-d120267933ba",
    description: "The Milky Way over a snow-covered mountain",
  },
  {
    photoId: "1439066615861-d1af74d74000",
    description: "A wooden landing stage on a still lake at dusk",
  },
  {
    photoId: "1449824913935-59a10b8d2000",
    description: "A wide city avenue between tall buildings",
  },
];

/**
 * A 32-bit FNV-1a hash. It only has to be stable and spread out; it is not
 * used for anything a stranger could profit from predicting. The bitwise
 * arithmetic is the algorithm itself, not a micro-optimisation.
 */
function hash(seed: string): number {
  let value = 0x81_1c_9d_c5;

  for (let index = 0; index < seed.length; index += 1) {
    value ^= seed.codePointAt(index) ?? 0;
    value = Math.imul(value, 0x01_00_01_93);
  }

  return value >>> 0;
}

/**
 * The background for a Quote, chosen from the fixed set. Seeded by the Quote's
 * slug, so it is stable across renders, requests and deploys: a Quote's Card
 * looks the same tomorrow as it did when it was shared.
 */
export function cardBackgroundFor(seed: string): CardBackground {
  const [first] = CARD_BACKGROUNDS;

  if (!first) {
    throw new Error("The Card template has no fallback backgrounds.");
  }

  return CARD_BACKGROUNDS[hash(seed) % CARD_BACKGROUNDS.length] ?? first;
}

/**
 * Twice the widest a Card is drawn, so the photograph stays sharp on a retina
 * screen: every Card is at most 544px, and a screenshot is taken at that size
 * or smaller.
 */
export const CARD_BACKGROUND_WIDTH = 1200;

/**
 * The URL for one background. Square and cropped, at a quality that survives
 * being screenshotted without carrying a megabyte of pixels.
 */
export function cardBackgroundUrl(background: CardBackground): string {
  const size = CARD_BACKGROUND_WIDTH;

  return `https://images.unsplash.com/photo-${background.photoId}?auto=format&fit=crop&w=${size}&h=${size}&q=70`;
}
