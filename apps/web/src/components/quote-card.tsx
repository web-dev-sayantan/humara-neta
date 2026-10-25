import { cn } from "@humara-neta/ui/lib/utils";
import type { CSSProperties } from "react";

import {
  CARD_BACKGROUND_WIDTH,
  cardBackgroundFor,
  cardBackgroundUrl,
} from "../lib/card-background";
import { cardDateLabel } from "../lib/card-date";
import { cardTypeScale } from "../lib/card-type";
import { SITE_DOMAIN } from "../lib/site";

export interface QuoteCardProps {
  /** The Card's text, exactly as the Editor typed it — line breaks and all. */
  text: string;
  /** The Quote's Date, a calendar day. `null` leaves the corner empty. */
  date: string | null;
  /** Where the Quote was made. `null` leaves the corner to the domain mark. */
  place: string | null;
  /** This Card's place in the Carousel, counting from 1. */
  position: number;
  /** How many Cards the Carousel has, so the Card can say "2 of 4". */
  total: number;
  /** The Quote's slug: one Quote always falls back to the same photograph. */
  backgroundSeed: string;
  /** Who the words are attributed to, for anyone who cannot see the page around it. */
  personName: string;
  /** The Card a reader meets first loads its photograph without waiting. */
  priority?: boolean;
  className?: string;
}

/**
 * What a Quote looks like, and the only definition of it. The same node is the
 * Quote page's hero today and every Card in every feed later, at whatever width
 * its container gives it: a square, so that what a reader sees and what they
 * screenshot cannot drift.
 *
 * Everything is measured against the Card's own width (`cqw`), never the
 * viewport, and the safe area is a generous margin inside it — a reader
 * cropping a screenshot through a chat app should still lose nothing.
 */
export function QuoteCard({
  text,
  date,
  place,
  position,
  total,
  backgroundSeed,
  personName,
  priority = false,
  className,
}: QuoteCardProps) {
  const typeScale = cardTypeScale(text);
  const background = cardBackgroundFor(backgroundSeed);

  return (
    <figure
      // The proportions of the template live in one place, so changing the
      // safe area or the gap between the words and the footnotes is one edit
      // rather than a hunt through class strings. Percentages are of the
      // Card's own box, which is what a square wants: `cqw` here would not
      // resolve, since a container cannot measure itself.
      style={
        {
          "--card-gap": "4cqw",
          "--card-radius": "2.5%",
          "--card-safe": "9cqw",
        } as CSSProperties
      }
      className={cn(
        "@container relative aspect-square w-full overflow-hidden rounded-(--card-radius) bg-neutral-300 inset-ring-1 inset-ring-black/10 dark:bg-neutral-900 dark:inset-ring-white/15",
        className
      )}
    >
      <div aria-hidden="true" className="absolute inset-0">
        <img
          alt=""
          className="card-photo size-full object-cover"
          decoding="async"
          draggable={false}
          fetchPriority={priority ? "high" : "auto"}
          height={CARD_BACKGROUND_WIDTH}
          loading={priority ? "eager" : "lazy"}
          src={cardBackgroundUrl(background)}
          width={CARD_BACKGROUND_WIDTH}
        />
        <div className="card-scrim absolute inset-0" />
        <div className="card-vignette absolute inset-0" />
      </div>

      <div className="relative flex h-full flex-col p-(--card-safe) text-neutral-900 dark:text-neutral-50">
        {date === null ? null : (
          <time className="card-meta self-end opacity-80" dateTime={date}>
            {cardDateLabel(date)}
          </time>
        )}

        <blockquote
          className="card-quote my-auto text-center font-serif text-pretty wrap-break-word whitespace-pre-wrap"
          style={
            {
              "--card-leading": typeScale.lineHeight,
              "--card-size": `${typeScale.sizeCqw}cqw`,
              "--card-tracking": `${typeScale.trackingEm}em`,
            } as CSSProperties
          }
        >
          {text}
        </blockquote>

        <div className="flex items-end justify-between gap-(--card-gap)">
          {place === null ? null : (
            <p className="card-meta max-w-[70%] opacity-80">{place}</p>
          )}
          <span aria-hidden="true" className="card-mark ml-auto">
            {SITE_DOMAIN}
          </span>
        </div>
      </div>

      {/* The visible words are the Card's content. This says what the Card is
          — which Card of the Carousel, whose words, which photograph — and
          carries the domain, because a screen reader gets no benefit from an
          inert watermark at the end of the line (ADR-0002). */}
      <figcaption className="sr-only">
        {`Card ${position} of ${total}, a quote attributed to ${personName}, published at ${SITE_DOMAIN}. The background is ${background.description}.`}
      </figcaption>
    </figure>
  );
}
