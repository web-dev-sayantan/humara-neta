import { ONE_TIME_CODE } from "@humara-neta/api/one-time-code";
import { Button } from "@humara-neta/ui/components/button";
import { Input } from "@humara-neta/ui/components/input";
import { Label } from "@humara-neta/ui/components/label";
import { type FormEvent, useId, useState } from "react";

import { GENERIC_SIGN_IN_FAILURE, failureMessage } from "../lib/auth-failures";

/** The shape Better Auth's client returns: data or an error carrying a code. */
export interface SignInAttempt {
  error?: { code?: string } | null;
}

export interface SignInScreenProps {
  googleSignIn: () => Promise<SignInAttempt>;
  requestCode: (email: string) => Promise<SignInAttempt>;
  verifyCode: (email: string, code: string) => Promise<SignInAttempt>;
  onSignedIn: () => void | Promise<void>;
  /** Words from the road in, e.g. the refusal code Google came back with. */
  initialMessage?: string;
}

const HINT = "The panel is open to people whose address has been added to the list.";

const CODE_PATTERN = new RegExp(`^\\d{${ONE_TIME_CODE.length}}$`);

/**
 * Google is the way in; the one-time code exists for people without a Google
 * account. The two calls are injected so the screen can be exercised without a
 * network, and so the route stays the only place that knows Better Auth.
 */
export function SignInScreen({
  googleSignIn,
  requestCode,
  verifyCode,
  onSignedIn,
  initialMessage,
}: SignInScreenProps) {
  const id = useId();
  const emailId = `${id}-email`;
  const codeId = `${id}-code`;
  const formId = `${id}-form`;

  const [formOpen, setFormOpen] = useState(false);
  const [stage, setStage] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [googlePending, setGooglePending] = useState(false);
  const [sendPending, setSendPending] = useState(false);
  const [verifyPending, setVerifyPending] = useState(false);
  const [notice, setNotice] = useState<string>();
  const [failure, setFailure] = useState<string>();

  const message = failure ?? notice ?? initialMessage;

  /**
   * Runs one call to Better Auth, owning the pending flag and turning either a
   * returned error code or a thrown failure into words. `true` means the call
   * succeeded.
   */
  async function attempt(
    setPending: (pending: boolean) => void,
    call: () => Promise<SignInAttempt>,
  ): Promise<boolean> {
    setPending(true);
    setFailure(undefined);

    try {
      const result = await call();

      if (result.error) {
        setFailure(failureMessage(result.error.code));
        return false;
      }

      return true;
    } catch {
      setFailure(GENERIC_SIGN_IN_FAILURE);
      return false;
    } finally {
      setPending(false);
    }
  }

  async function signInWithGoogle() {
    await attempt(setGooglePending, googleSignIn);
  }

  async function sendCodeTo(address: string) {
    const sent = await attempt(setSendPending, () => requestCode(address));

    if (sent) {
      setNotice(`We sent a ${ONE_TIME_CODE.length}-digit code to ${address}.`);
      setCode("");
      setStage("code");
    }
  }

  async function sendCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await sendCodeTo(email);
  }

  async function signInWithCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (await attempt(setVerifyPending, () => verifyCode(email, code.trim()))) {
      await onSignedIn();
    }
  }

  function chooseDifferentAddress() {
    setNotice(undefined);
    setFailure(undefined);
    setCode("");
    setStage("email");
  }

  return (
    <main className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center gap-6 px-4 py-16">
      <header className="flex flex-col gap-2">
        <h1 className="text-xl font-medium">Sign in</h1>
        <p className="text-muted-foreground text-sm">{HINT}</p>
      </header>

      <p
        aria-live="polite"
        className="border-border bg-muted/40 min-h-0 rounded-none border px-3 py-2 text-sm empty:hidden"
        role="status"
      >
        {message}
      </p>

      <Button disabled={googlePending} onClick={signInWithGoogle} size="lg">
        {googlePending ? "Opening Google…" : "Continue with Google"}
      </Button>

      <div className="flex flex-col gap-3">
        <Button
          aria-controls={formId}
          aria-expanded={formOpen}
          onClick={() => setFormOpen((open) => !open)}
          variant="ghost"
        >
          {formOpen ? "Hide the code form" : "Sign in with a code instead"}
        </Button>

        {formOpen ? (
          <div className="border-border flex flex-col gap-4 border p-4" id={formId}>
            {stage === "email" ? (
              <form className="flex flex-col gap-3" onSubmit={sendCode}>
                <div className="flex flex-col gap-2">
                  <Label htmlFor={emailId}>Email address</Label>
                  <Input
                    autoComplete="email"
                    id={emailId}
                    name="email"
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    type="email"
                    value={email}
                  />
                </div>
                <Button disabled={sendPending} type="submit" variant="outline">
                  {sendPending ? "Sending…" : "Email me a code"}
                </Button>
              </form>
            ) : (
              <form className="flex flex-col gap-3" onSubmit={signInWithCode}>
                <div className="flex flex-col gap-2">
                  <Label htmlFor={codeId}>Six-digit code</Label>
                  <Input
                    autoComplete="one-time-code"
                    id={codeId}
                    inputMode="numeric"
                    maxLength={ONE_TIME_CODE.length}
                    name="code"
                    onChange={(event) => setCode(event.target.value)}
                    pattern={CODE_PATTERN.source}
                    required
                    value={code}
                  />
                </div>
                <Button disabled={verifyPending} type="submit" variant="outline">
                  {verifyPending ? "Signing in…" : "Sign in"}
                </Button>
                <Button
                  disabled={sendPending}
                  onClick={() => sendCodeTo(email)}
                  type="button"
                  variant="ghost"
                >
                  {sendPending ? "Sending…" : "Send a new code"}
                </Button>
                <Button onClick={chooseDifferentAddress} type="button" variant="ghost">
                  Use a different address
                </Button>
              </form>
            )}
          </div>
        ) : null}
      </div>
    </main>
  );
}
