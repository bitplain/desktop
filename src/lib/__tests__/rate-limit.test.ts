import { describe, it, expect, vi } from "vitest";

vi.mock("../db", () => {
  const buckets = new Map<
    string,
    { key: string; hits: number; resetAt: Date; updatedAt: Date }
  >();

  const rateLimitBucket = {
    findUnique: async ({ where: { key } }: { where: { key: string } }) =>
      buckets.get(key) ?? null,
    create: async ({
      data,
    }: {
      data: { key: string; hits: number; resetAt: Date };
    }) => {
      const entry = { ...data, updatedAt: new Date() };
      buckets.set(data.key, entry);
      return entry;
    },
    update: async ({
      where: { key },
      data,
    }: {
      where: { key: string };
      data: { hits?: number; resetAt?: Date };
    }) => {
      const existing = buckets.get(key);
      if (!existing) {
        throw new Error("Missing bucket");
      }
      const entry = {
        ...existing,
        ...data,
        updatedAt: new Date(),
      };
      buckets.set(key, entry);
      return entry;
    },
    upsert: async ({
      where: { key },
      create,
      update,
    }: {
      where: { key: string };
      create: { key: string; hits: number; resetAt: Date };
      update: { hits?: number; resetAt?: Date };
    }) => {
      if (buckets.has(key)) {
        return rateLimitBucket.update({ where: { key }, data: update });
      }
      return rateLimitBucket.create({ data: create });
    },
  };

  return {
    getPrisma: () => ({
      rateLimitBucket,
    }),
  };
});

import { consumeRateLimit } from "../rateLimit";

describe("rate limit", () => {
  it("blocks after limit reached", async () => {
    const key = "login|127.0.0.1|user@example.com";
    for (let i = 0; i < 5; i += 1) {
      await consumeRateLimit(key, { limit: 5, windowMs: 1000 });
    }
    const result = await consumeRateLimit(key, { limit: 5, windowMs: 1000 });
    expect(result.allowed).toBe(false);
  });
});
