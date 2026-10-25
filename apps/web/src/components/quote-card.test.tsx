// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { QuoteCard } from "./quote-card";

afterEach(cleanup);

/** A real quote, with the line breaks an Editor typed. */
const LONG =
  "For seventy years we were told that the only politics worth having was the politics of the drawing room.\n\nWhat we have learned since is simpler and harder: no speech changes the arithmetic of a kitchen that cannot afford the month.";

function renderCard({
  text = "We will not be moved.",
  date = "2026-03-20",
  place = "Esplanade, Kolkata",
}: {
  text?: string;
  date?: string | null;
  place?: string | null;
} = {}) {
  return render(
    <QuoteCard
      backgroundSeed="kolkata-monsoon-speech"
      date={date}
      personName="Mamata Banerjee"
      place={place}
      position={2}
      text={text}
      total={4}
    />
  );
}

describe("the Card", () => {
  it("reads out the words the Editor typed, line breaks and all", () => {
    renderCard({ text: LONG });

    expect(screen.getByRole("blockquote").textContent).toBe(LONG);
  });

  it("describes itself, so it is not just a picture of a quote", () => {
    renderCard();

    expect(
      screen.getByText(
        /Card 2 of 4, a quote attributed to Mamata Banerjee, published at/u
      )
    ).toBeTruthy();
  });

  it("shows the Date, in words, and the Place", () => {
    renderCard();

    expect(screen.getByText("20 March 2026")).toBeTruthy();
    expect(screen.getByText("Esplanade, Kolkata")).toBeTruthy();
  });

  it("leaves out a Date that is absent", () => {
    renderCard({ date: null });

    expect(screen.queryByText("20 March 2026")).toBeNull();
    expect(screen.getByText("Esplanade, Kolkata")).toBeTruthy();
  });

  it("leaves out a Place that is absent", () => {
    renderCard({ place: null });

    expect(screen.queryByText("Esplanade, Kolkata")).toBeNull();
    expect(screen.getByText("20 March 2026")).toBeTruthy();
  });

  it("still speaks for itself when both are absent", () => {
    renderCard({ date: null, place: null });

    expect(screen.getByText("We will not be moved.")).toBeTruthy();
    expect(screen.getByText(/Card 2 of 4/u)).toBeTruthy();
  });
});
