import { CARD_TEXT_WARN } from "@humara-neta/api/quote-limits";
import { describe, expect, it } from "vitest";

import { CARD_TYPE_STEPS, cardTypeScale } from "./card-type";

/** A quote of exactly `length` characters, as the Editor would have typed it. */
function quoteOfLength(length: number): string {
  return "word ".repeat(Math.ceil(length / 5)).slice(0, length);
}

describe("the type a Card sets its text in", () => {
  it("sets a short quote large", () => {
    expect(cardTypeScale("We will not be moved.").sizeCqw).toBe(8.4);
  });

  it("sets a quote the length of a paragraph smaller", () => {
    expect(cardTypeScale(quoteOfLength(240)).sizeCqw).toBe(5);
  });

  it("shrinks a quote past the warning length rather than truncating it", () => {
    const long = quoteOfLength(CARD_TEXT_WARN + 40);
    const overlong = quoteOfLength(900);

    expect(cardTypeScale(long).sizeCqw).toBeLessThan(
      cardTypeScale(quoteOfLength(CARD_TEXT_WARN)).sizeCqw
    );
    expect(cardTypeScale(overlong).sizeCqw).toBeLessThan(
      cardTypeScale(long).sizeCqw
    );
  });

  it("keeps shrinking past the last step, so nothing is ever cut off", () => {
    const sizes = [600, 900, 1800, 3600].map(
      (length) => cardTypeScale(quoteOfLength(length)).sizeCqw
    );

    for (const [index, size] of sizes.entries()) {
      const previous = sizes[index - 1];

      expect(size).toBeGreaterThan(0);

      if (previous !== undefined) {
        expect(size).toBeLessThan(previous);
      }
    }
  });

  it("counts typed line breaks towards the length", () => {
    // Breaks cost the same space as the characters they replace: a Card of
    // short lines is not a short Card.
    const broken = "word\n".repeat(60);
    const unbroken = quoteOfLength(broken.length);

    expect(cardTypeScale(broken)).toEqual(cardTypeScale(unbroken));
  });

  it("tightens leading and tracking as the type grows", () => {
    const [largest] = CARD_TYPE_STEPS;
    const smallest = CARD_TYPE_STEPS.at(-1);

    expect(largest).toBeDefined();
    expect(smallest).toBeDefined();

    if (!(largest && smallest)) {
      return;
    }

    expect(largest.lineHeight).toBeLessThan(smallest.lineHeight);
    expect(largest.trackingEm).toBeLessThan(smallest.trackingEm);
    expect(largest.sizeCqw).toBeGreaterThan(smallest.sizeCqw);
  });

  it("moves to the smaller step exactly one character past a boundary", () => {
    for (const [index, step] of CARD_TYPE_STEPS.entries()) {
      const next = CARD_TYPE_STEPS[index + 1];

      if (!next) {
        continue;
      }

      expect(cardTypeScale(quoteOfLength(step.maxLength)).sizeCqw).toBe(
        step.sizeCqw
      );
      expect(cardTypeScale(quoteOfLength(step.maxLength + 1)).sizeCqw).toBe(
        next.sizeCqw
      );
    }
  });

  it("holds a handful of sizes, not a continuum, for the lengths editors write", () => {
    // Every length up to the last named step, in a sweep, lands on one of the
    // five sizes: two quotes of similar length are set the same.
    const sizes = new Set(
      Array.from(
        { length: 60 },
        (_, index) => cardTypeScale(quoteOfLength(index * 9)).sizeCqw
      )
    );

    expect(sizes.size).toBe(CARD_TYPE_STEPS.length);
  });
});
