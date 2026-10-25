import { describe, expect, it } from "vitest";

import { createResendSender } from "../src/email";

interface CapturedRequest {
  url: string;
  init: RequestInit | undefined;
}

function fakeFetch(status: number) {
  const requests: CapturedRequest[] = [];
  const fetch = async (input: string | URL | Request, init?: RequestInit) => {
    requests.push({ url: String(input), init });
    return new Response(status === 200 ? null : "refused", { status });
  };

  return { requests, fetch };
}

const CONFIG = {
  apiKey: "re_test_key",
  from: "humara-neta <sign-in@example.com>",
};

describe("Resend one-time-code email", () => {
  it("posts the code to Resend, addressed to the person who asked for it", async () => {
    const { requests, fetch } = fakeFetch(200);
    const send = createResendSender({ ...CONFIG, fetch });

    await send({ email: "ada@example.com", otp: "898912" });

    expect(requests).toHaveLength(1);
    const [request] = requests;
    expect(request?.url).toBe("https://api.resend.com/emails");

    const headers = new Headers(request?.init?.headers);
    expect(headers.get("authorization")).toBe("Bearer re_test_key");
    expect(headers.get("content-type")).toBe("application/json");

    const body = JSON.parse(String(request?.init?.body)) as Record<string, unknown>;
    expect(body).toMatchObject({
      from: "humara-neta <sign-in@example.com>",
      to: "ada@example.com",
      subject: expect.stringContaining("sign-in code"),
    });
    expect(body.text).toContain("898912");
    expect(body.text).toContain("5 minutes");
  });

  it("fails loudly when Resend refuses the message", async () => {
    const { fetch } = fakeFetch(422);
    const send = createResendSender({ ...CONFIG, fetch });

    await expect(send({ email: "ada@example.com", otp: "898912" })).rejects.toThrow(/422/);
  });
});
