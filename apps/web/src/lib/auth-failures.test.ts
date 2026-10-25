import {
  INVALID_ONE_TIME_CODE,
  NOT_ALLOWLISTED,
  NOT_ALLOWLISTED_MESSAGE,
  ONE_TIME_CODE_EXPIRED,
  TOO_MANY_ONE_TIME_CODE_ATTEMPTS,
} from "@humara-neta/api/refusal";
import { describe, expect, it } from "vitest";

import { GENERIC_SIGN_IN_FAILURE, failureMessage } from "./auth-failures";

describe("sign-in failure copy", () => {
  it("explains a refused address with the same words as the refusal itself", () => {
    expect(failureMessage(NOT_ALLOWLISTED)).toBe(NOT_ALLOWLISTED_MESSAGE);
  });

  it("tells someone a wrong, expired, or exhausted code what to do next", () => {
    expect(failureMessage(INVALID_ONE_TIME_CODE)).toMatch(/didn't match/i);
    expect(failureMessage(ONE_TIME_CODE_EXPIRED)).toMatch(/expired/i);
    expect(failureMessage(TOO_MANY_ONE_TIME_CODE_ATTEMPTS)).toMatch(
      /too many/i
    );
  });

  it("falls back to a generic failure rather than showing a raw code", () => {
    expect(failureMessage()).toBe(GENERIC_SIGN_IN_FAILURE);
    expect(failureMessage("SOMETHING_NEW")).toBe(GENERIC_SIGN_IN_FAILURE);
  });

  it("does not let a code that only looks like a key reach the screen", () => {
    expect(failureMessage("")).toBe(GENERIC_SIGN_IN_FAILURE);
    expect(failureMessage("constructor")).toBe(GENERIC_SIGN_IN_FAILURE);
    expect(failureMessage("toString")).toBe(GENERIC_SIGN_IN_FAILURE);
  });
});
