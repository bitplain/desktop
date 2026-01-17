import { describe, it, expect, vi } from "vitest";

vi.mock("../db", () => ({
  getPrisma: () => {
    throw new Error("DATABASE_URL is required");
  },
}));

import { consumeRateLimit } from "../rateLimit";

describe("rate limit fallback", () => {
  it("uses in-memory when database is unavailable", async () => {
    const key = "setup|127.0.0.1";
    for (let i = 0; i < 3; i += 1) {
      const result = await consumeRateLimit(key, { limit: 3, windowMs: 1000 });
      expect(result.allowed).toBe(true);
    }
    const blocked = await consumeRateLimit(key, { limit: 3, windowMs: 1000 });
    expect(blocked.allowed).toBe(false);
  });
});
