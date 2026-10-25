import { Outlet, createFileRoute } from "@tanstack/react-router";

/**
 * A Person's URL space. Their page lives at the index (`/<person-slug>`) and
 * each of their Quotes at `/<person-slug>/<quote-slug>`, so the permalink
 * nests under the Person without either page owning the other's layout.
 */
export const Route = createFileRoute("/$personSlug")({
  component: PersonSpace,
});

function PersonSpace() {
  return <Outlet />;
}
