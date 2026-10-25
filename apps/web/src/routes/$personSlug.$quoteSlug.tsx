import { Link, createFileRoute, notFound } from "@tanstack/react-router";

import { QuoteCard } from "@/components/quote-card";
import { isNotFound } from "@/lib/orpc-errors";

/**
 * The permalink a Quote is shared by: `/<person-slug>/<quote-slug>`. The Card is
 * the hero; what can never live inside it — the Editorial note, and later the
 * Sources and the share control — sits below.
 */
export const Route = createFileRoute("/$personSlug/$quoteSlug")({
  loader: async ({ context, params }) => {
    try {
      return await context.queryClient.ensureQueryData(
        context.orpc.quote.bySlug.queryOptions({
          input: {
            personSlug: params.personSlug,
            quoteSlug: params.quoteSlug,
          },
        })
      );
    } catch (error) {
      // A Quote nobody lives at is a missing page, not a failed one. #10 turns
      // an archived one into a 410; until then it is simply not served.
      if (isNotFound(error)) {
        throw notFound();
      }

      throw error;
    }
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [{ title: `${loaderData.person.name} — humara-neta` }]
      : [],
  }),
  component: QuotePage,
});

function QuotePage() {
  const quote = Route.useLoaderData();
  const total = quote.cards.length;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-medium">
          <Link
            to="/$personSlug"
            params={{ personSlug: quote.person.slug }}
            className="hover:underline"
          >
            {quote.person.name}
          </Link>
        </h1>
      </header>

      {/* A Carousel in one column until #11 turns it into something a reader
          swipes; each Card here is the same node the feeds will use. */}
      <div className="mx-auto flex w-full max-w-[34rem] flex-col gap-4">
        {quote.cards.map((card, index) => (
          <QuoteCard
            key={card.id}
            backgroundSeed={quote.slug}
            date={quote.date}
            personName={quote.person.name}
            place={quote.place}
            position={index + 1}
            priority={index === 0}
            text={card.text}
            total={total}
          />
        ))}
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-muted-foreground text-xs tracking-wide uppercase">
          Editorial note
        </h2>
        <p className="text-sm leading-relaxed wrap-break-word whitespace-pre-wrap">
          {quote.editorialNote}
        </p>
      </section>
    </main>
  );
}
