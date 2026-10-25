import { Link, createFileRoute, notFound } from "@tanstack/react-router";

import { isNotFound } from "@/lib/orpc-errors";

export const Route = createFileRoute("/$personSlug")({
  loader: async ({ context, params }) => {
    try {
      return await context.queryClient.ensureQueryData(
        context.orpc.person.bySlug.queryOptions({
          input: { slug: params.personSlug },
        })
      );
    } catch (error) {
      // A slug no Person lives at is a missing page, not a failed one.
      if (isNotFound(error)) {
        throw notFound();
      }

      throw error;
    }
  },
  head: ({ loaderData }) => ({
    meta: loaderData ? [{ title: `${loaderData.name} — humara-neta` }] : [],
  }),
  component: PersonPage,
});

function PersonPage() {
  const person = Route.useLoaderData();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10">
      <header className="flex flex-col gap-2">
        <Link
          to="/figures"
          className="text-muted-foreground hover:text-foreground text-xs tracking-wide uppercase"
        >
          All figures
        </Link>
        <h1 className="text-3xl font-medium">{person.name}</h1>
        {person.bio === null ? null : (
          <p className="text-muted-foreground text-sm">{person.bio}</p>
        )}
      </header>
    </main>
  );
}
