import { describe, it, expect, vi } from "vitest";
vi.mock("@/lib/inviteCodes", () => ({
  verifyInviteCode: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/db", () => ({
  getPrisma: () => ({
    invite: {
      findMany: async () => [
        {
          id: "invite-1",
          codeHash: "hash",
          expiresAt: new Date(Date.now() + 60_000),
          usedAt: null,
        },
      ],
    },
    $transaction: async (handler: (tx: any) => Promise<void>) =>
      handler({
        user: {
          create: async () => ({ id: "user-1" }),
        },
        invite: {
          update: async () => ({ id: "invite-1" }),
        },
      }),
  }),
}));

vi.mock("@/lib/rateLimit", () => {
  let calls = 0;
  return {
    consumeRateLimit: vi.fn().mockImplementation(async () => {
      calls += 1;
      return {
        allowed: calls <= 5,
        remaining: Math.max(0, 5 - calls),
        resetAt: new Date(Date.now() + 60_000),
      };
    }),
  };
});

import { POST as register } from "@/app/api/register/route";

describe("register rate limit", () => {
  it("returns 429 after limit", async () => {
    const makeRequest = () =>
      new Request("http://localhost/api/register", {
        method: "POST",
        body: JSON.stringify({
          email: "admin@test.dev",
          password: "Password1!",
          inviteCode: "INV-AAAAAA",
        }),
      });
    for (let i = 0; i < 5; i += 1) {
      await register(makeRequest());
    }
    const response = await register(makeRequest());
    expect(response.status).toBe(429);
  });
});
