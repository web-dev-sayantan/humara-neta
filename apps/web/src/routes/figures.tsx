import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@humara-neta/ui/components/empty";
import { Link, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/figures")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(
      context.orpc.person.list.queryOptions()
    ),
  head: () => ({
    meta: [{ title: "Figures — humara-neta" }],
  }),
  component: Figures,
});

function Figures() {
  const people = Route.useLoaderData();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-medium">Figures</h1>
        <p className="text-muted-foreground text-sm">
          Every Person with a page on this site.
        </p>
      </header>

      {people.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle>No figures yet</EmptyTitle>
            <EmptyDescription>
              Figures appear here once an editor has added them.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="divide-border divide-y border-y">
          {people.map((person) => (
            <li key={person.id}>
              <Link
                to="/$personSlug"
                className="flex flex-col gap-1 py-4"
                params={{ personSlug: person.slug }}
              >
                <span className="text-lg font-medium">{person.name}</span>
                {person.bio === null ? null : (
                  <span className="text-muted-foreground text-sm">
                    {person.bio}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
