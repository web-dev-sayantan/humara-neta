import type { Role } from "@humara-neta/api/actor";
import { Button } from "@humara-neta/ui/components/button";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";

import { PersonPanel } from "@/components/person-panel";
import { QuotePanel } from "@/components/quote-panel";
import { authClient } from "@/lib/auth-client";
import { isUnauthorized } from "@/lib/orpc-errors";

export const Route = createFileRoute("/admin")({
  beforeLoad: async ({ context }) => {
    try {
      const viewer = await context.queryClient.ensureQueryData(
        context.orpc.admin.me.queryOptions()
      );

      return { viewer };
    } catch (error) {
      if (isUnauthorized(error)) {
        throw redirect({ to: "/sign-in" });
      }

      throw error;
    }
  },
  component: AdminShell,
});

const ROLE_LABEL = {
  admin: "Administrator",
  editor: "Editor",
} satisfies Record<Role, string>;

function AdminShell() {
  const { viewer } = Route.useRouteContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    try {
      await authClient.signOut();
    } finally {
      queryClient.clear();
      await navigate({ to: "/sign-in" });
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10">
      <header className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-muted-foreground text-xs tracking-wide uppercase">
            Signed in as
          </p>
          <h1 className="text-2xl font-medium">
            {viewer.name || viewer.email}
          </h1>
          <p className="text-muted-foreground text-sm">
            {ROLE_LABEL[viewer.role]}
          </p>
        </div>
        <Button onClick={signOut} variant="outline">
          Sign out
        </Button>
      </header>

      <PersonPanel />
      <QuotePanel />
    </main>
  );
}
