import { CARD_TEXT_WARN } from "@humara-neta/api/quote-limits";

/**
 * How large a Card sets its text. A Card is a square that is screenshotted and
 * read at whatever width it lands at, so its type is measured in `cqw` — a
 * percentage of the Card's own width — and never in `px`. One definition of
 * the template then holds from a thumbnail in a feed to the hero on a permalink.
 */
export interface CardTypeStep {
  /** Longest text, in characters, that is still set at this step. */
  maxLength: number;
  /** Font size as a percentage of the Card's width. */
  sizeCqw: number;
  /** Line height as a multiple of the font size. */
  lineHeight: number;
  /** Letter spacing in em; negative for display sizes, near zero for long text. */
  trackingEm: number;
}

/**
 * Five steps, not a continuous scale: a reader should not be able to tell two
 * quotes of similar length apart, but a short quote must look composed rather
 * than adrift, and a long one must look deliberate rather than crammed.
 *
 * Each step is sized so that a text of its `maxLength` fills roughly half the
 * Card's width in height, inside the safe area, at a reading measure of 20–52
 * characters a line.
 */
export const CARD_TYPE_STEPS: readonly CardTypeStep[] = [
  { maxLength: 90, sizeCqw: 8.4, lineHeight: 1.1, trackingEm: -0.03 },
  { maxLength: 170, sizeCqw: 6.4, lineHeight: 1.18, trackingEm: -0.025 },
  {
    maxLength: CARD_TEXT_WARN,
    sizeCqw: 5,
    lineHeight: 1.25,
    trackingEm: -0.02,
  },
  { maxLength: 420, sizeCqw: 4, lineHeight: 1.32, trackingEm: -0.015 },
  { maxLength: 535, sizeCqw: 3.2, lineHeight: 1.38, trackingEm: -0.01 },
];

/**
 * Past the last step the steps run out but the text does not: the size keeps
 * falling as the square root of the length, so the area the words take grows
 * with the words and a Card is never cut off. The constant is the size that
 * fits `TAIL_START` characters, which is where the last step ends.
 */
const TAIL_CONSTANT = 72;

const TAIL_TYPE = {
  lineHeight: 1.4,
  trackingEm: -0.005,
} as const;

export interface CardTypeScale {
  /** Font size as a percentage of the Card's width. */
  sizeCqw: number;
  /** Line height as a multiple of the font size. */
  lineHeight: number;
  /** Letter spacing in em; negative for display sizes, near zero for long text. */
  trackingEm: number;
}

/**
 * The size a Card sets its text at. Typed line breaks count towards the length,
 * because they take up the space the characters they replace would have.
 */
export function cardTypeScale(text: string): CardTypeScale {
  const lastStep = CARD_TYPE_STEPS.at(-1);
  const step = CARD_TYPE_STEPS.find(
    (candidate) => text.length <= candidate.maxLength
  );

  if (step) {
    const { sizeCqw, lineHeight, trackingEm } = step;

    return { sizeCqw, lineHeight, trackingEm };
  }

  if (!lastStep) {
    throw new Error("The Card template has no type steps.");
  }

  // A Card this long is an editing mistake — the form warns at `CARD_TEXT_WARN`
  // — but a mistake is reduced until it fits, never cut.
  return {
    sizeCqw: round(TAIL_CONSTANT / Math.sqrt(Math.max(text.length, 1))),
    ...TAIL_TYPE,
  };
}

/** Two decimals is as fine as a `cqw` size needs to be, and keeps markup stable. */
function round(sizeCqw: number): number {
  return Math.round(sizeCqw * 100) / 100;
}
