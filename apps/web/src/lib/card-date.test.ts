import { describe, expect, it } from "vitest";

import { cardDateLabel } from "./card-date";

describe("the Date a Card shows", () => {
  it("writes a calendar day the way a reader says it", () => {
    expect(cardDateLabel("2026-03-20")).toBe("20 March 2026");
  });

  it("does not pad a single-digit day", () => {
    expect(cardDateLabel("2026-01-01")).toBe("1 January 2026");
  });

  it("keeps the day the Editor typed wherever the reader sits", () => {
    // Midnight UTC is the previous day in the Americas: reading the day in the
    // local zone would silently move every Card's Date back by one.
    expect(cardDateLabel("2026-12-31")).toBe("31 December 2026");
  });
});
