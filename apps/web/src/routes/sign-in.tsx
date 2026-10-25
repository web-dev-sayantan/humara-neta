import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { SignInScreen } from "@/components/sign-in-screen";
import { failureMessage } from "@/lib/auth-failures";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/sign-in")({
  validateSearch: (search: Record<string, unknown>): { error?: string } =>
    typeof search.error === "string" ? { error: search.error } : {},
  component: SignIn,
});

function SignIn() {
  const { error } = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // The road in reports a failure as a code; the same copy answers for every path.
  const initialMessage = error === undefined ? undefined : failureMessage(error);

  async function googleSignIn() {
    return authClient.signIn.social({
      provider: "google",
      callbackURL: "/admin",
      errorCallbackURL: "/sign-in",
    });
  }

  async function requestCode(email: string) {
    return authClient.emailOtp.sendVerificationOtp({ email, type: "sign-in" });
  }

  async function verifyCode(email: string, otp: string) {
    return authClient.signIn.emailOtp({ email, otp });
  }

  async function onSignedIn() {
    queryClient.clear();
    await navigate({ to: "/admin" });
  }

  return (
    <SignInScreen
      googleSignIn={googleSignIn}
      initialMessage={initialMessage}
      onSignedIn={onSignedIn}
      requestCode={requestCode}
      verifyCode={verifyCode}
    />
  );
}
