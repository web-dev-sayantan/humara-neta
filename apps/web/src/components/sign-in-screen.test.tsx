// @vitest-environment jsdom
import {
  INVALID_ONE_TIME_CODE,
  NOT_ALLOWLISTED,
  NOT_ALLOWLISTED_MESSAGE,
} from "@humara-neta/api/refusal";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { type SignInScreenProps, SignInScreen } from "./sign-in-screen";

afterEach(cleanup);

type ScreenOptions = Partial<SignInScreenProps>;

function renderScreen(options: ScreenOptions = {}) {
  const googleSignIn = options.googleSignIn ?? vi.fn(async () => ({ error: null }));
  const requestCode = options.requestCode ?? vi.fn(async () => ({ error: null }));
  const verifyCode = options.verifyCode ?? vi.fn(async () => ({ error: null }));
  const onSignedIn = options.onSignedIn ?? vi.fn();

  render(
    <SignInScreen
      googleSignIn={googleSignIn}
      requestCode={requestCode}
      verifyCode={verifyCode}
      onSignedIn={onSignedIn}
    />,
  );

  return { googleSignIn, requestCode, verifyCode, onSignedIn };
}

/** Enters an address and lands on the code stage, as a person would. */
async function openCodeStage(options: ScreenOptions = {}) {
  const mocks = renderScreen(options);

  fireEvent.click(screen.getByRole("button", { name: /code instead/i }));
  fireEvent.change(screen.getByLabelText("Email address"), {
    target: { value: "ada@example.com" },
  });
  fireEvent.click(screen.getByRole("button", { name: /email me a code/i }));
  await screen.findByLabelText(/six-digit code/i);

  return mocks;
}

async function enterCode(code: string) {
  fireEvent.change(await screen.findByLabelText(/six-digit code/i), {
    target: { value: code },
  });
  fireEvent.click(screen.getByRole("button", { name: /^sign in$/i }));
}

describe("sign-in screen", () => {
  it("offers Google as the first action and keeps the code form out of the way", () => {
    renderScreen();

    const [firstButton] = screen.getAllByRole("button");
    expect(firstButton?.textContent).toMatch(/continue with google/i);
    expect(screen.queryByLabelText("Email address")).toBeNull();
  });

  it("reveals the code form as the fallback", () => {
    renderScreen();

    fireEvent.click(screen.getByRole("button", { name: /code instead/i }));

    expect(screen.getByLabelText("Email address")).toBeTruthy();
  });

  it("emails a code to the address that was entered", async () => {
    const { requestCode } = await openCodeStage();

    expect(requestCode).toHaveBeenCalledWith("ada@example.com");
    expect(screen.getByRole("status").textContent).toMatch(/ada@example\.com/);
  });

  it("signs in with the code and hands over to the caller", async () => {
    const { verifyCode, onSignedIn } = await openCodeStage();

    await enterCode("123456");

    expect(verifyCode).toHaveBeenCalledWith("ada@example.com", "123456");
    await waitFor(() => expect(onSignedIn).toHaveBeenCalled());
  });

  it("sends a fresh code on request, because the first may have expired", async () => {
    const { requestCode } = await openCodeStage();

    fireEvent.click(screen.getByRole("button", { name: /send a new code/i }));

    await waitFor(() => expect(requestCode).toHaveBeenCalledTimes(2));
    expect(requestCode).toHaveBeenLastCalledWith("ada@example.com");
  });

  it("shows why a code was refused and does not pretend to be signed in", async () => {
    const { onSignedIn } = await openCodeStage({
      verifyCode: vi.fn(async () => ({ error: { code: INVALID_ONE_TIME_CODE } })),
    });

    await enterCode("000000");

    expect((await screen.findByText(/didn't match/i)).textContent).toMatch(/check the six digits/i);
    expect(onSignedIn).not.toHaveBeenCalled();
  });

  it("shows the allowlist refusal without asking for a code", async () => {
    renderScreen({ requestCode: vi.fn(async () => ({ error: { code: NOT_ALLOWLISTED } })) });

    fireEvent.click(screen.getByRole("button", { name: /code instead/i }));
    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "mallory@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /email me a code/i }));

    expect((await screen.findByText(NOT_ALLOWLISTED_MESSAGE)).textContent).toBe(
      NOT_ALLOWLISTED_MESSAGE,
    );
    expect(screen.queryByLabelText(/six-digit code/i)).toBeNull();
  });
});
