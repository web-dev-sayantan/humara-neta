import { NOT_ALLOWLISTED, NOT_ALLOWLISTED_MESSAGE } from "@humara-neta/api/refusal";
import { Button } from "@humara-neta/ui/components/button";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/sign-in")({
  validateSearch: (search: Record<string, unknown>): { error?: string } =>
    typeof search.error === "string" ? { error: search.error } : {},
  component: SignIn,
});

const GENERIC_FAILURE = "Sign-in didn't finish. Please try again.";

function SignIn() {
  const { error } = Route.useSearch();
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<string | undefined>();

  const refusal = error === NOT_ALLOWLISTED ? NOT_ALLOWLISTED_MESSAGE : undefined;
  const message = refusal ?? failure ?? (error ? GENERIC_FAILURE : undefined);

  async function signInWithGoogle() {
    setPending(true);
    setFailure(undefined);

    try {
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: "/admin",
        errorCallbackURL: "/sign-in",
      });

      if (result.error) {
        setFailure(GENERIC_FAILURE);
      }
    } catch {
      setFailure(GENERIC_FAILURE);
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center gap-6 px-4 py-16">
      <header className="flex flex-col gap-2">
        <h1 className="text-xl font-medium">Sign in</h1>
        <p className="text-muted-foreground text-sm">
          The panel is open to people whose address has been added to the list.
        </p>
      </header>

      {message ? (
        <p
          aria-live="polite"
          className="border-border bg-muted/40 rounded-none border px-3 py-2 text-sm"
        >
          {message}
        </p>
      ) : null}

      <Button disabled={pending} onClick={signInWithGoogle} size="lg">
        {pending ? "Opening Google…" : "Continue with Google"}
      </Button>
    </main>
  );
}
