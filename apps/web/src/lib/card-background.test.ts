import { describe, expect, it } from "vitest";

import {
  CARD_BACKGROUNDS,
  CARD_BACKGROUND_WIDTH,
  cardBackgroundFor,
  cardBackgroundUrl,
} from "./card-background";

describe("the background a Card falls back to", () => {
  it("puts the same Quote on the same background every time", () => {
    const first = cardBackgroundFor("kolkata-monsoon-speech");
    const second = cardBackgroundFor("kolkata-monsoon-speech");

    expect(second).toBe(first);
  });

  it("uses the whole fixed set, so the site does not look like one template", () => {
    const chosen = new Set(
      Array.from(
        { length: 60 },
        (_, index) => cardBackgroundFor(`quote-${index}`).photoId
      )
    );

    expect(chosen.size).toBe(CARD_BACKGROUNDS.length);
  });

  it("still answers for a Quote with no slug yet", () => {
    expect(CARD_BACKGROUNDS).toContain(cardBackgroundFor(""));
  });

  it("describes every photo, so a Card is never just a picture", () => {
    for (const background of CARD_BACKGROUNDS) {
      expect(background.description.length).toBeGreaterThan(0);
    }
  });

  it("asks Unsplash for a square at the size the Card needs", () => {
    const [background] = CARD_BACKGROUNDS;

    expect(background).toBeDefined();

    if (!background) {
      return;
    }

    const url = cardBackgroundUrl(background);

    expect(url).toContain(`images.unsplash.com/photo-${background.photoId}`);
    expect(url).toContain(`w=${CARD_BACKGROUND_WIDTH}`);
    expect(url).toContain(`h=${CARD_BACKGROUND_WIDTH}`);
    expect(url).toContain("fit=crop");
    expect(url).toContain("q=70");
  });
});
