import { Link, createFileRoute, notFound } from "@tanstack/react-router";

import { isNotFound } from "@/lib/orpc-errors";

/**
 * The permalink a Quote is shared by: `/<person-slug>/<quote-slug>`. Plain on
 * purpose — the square Card component is its own ticket (#6); what this page
 * proves is the whole data path from the admin form to a shareable URL.
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
  const hasFootnote = quote.date !== null || quote.place !== null;

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

      <div className="flex flex-col gap-4">
        {quote.cards.map((card) => (
          <blockquote
            key={card.id}
            className="border p-6 text-xl leading-relaxed whitespace-pre-wrap"
          >
            {card.text}
          </blockquote>
        ))}
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-muted-foreground text-xs tracking-wide uppercase">
          Editorial note
        </h2>
        <p className="text-sm leading-relaxed whitespace-pre-wrap">
          {quote.editorialNote}
        </p>
      </section>

      {hasFootnote ? (
        <footer className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs">
          {quote.date === null ? null : (
            <time dateTime={quote.date}>{quote.date}</time>
          )}
          {quote.place === null ? null : <span>{quote.place}</span>}
        </footer>
      ) : null}
    </main>
  );
}
