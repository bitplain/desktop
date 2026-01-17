import { describe, expect, it, vi } from "vitest";

vi.mock("pg", () => {
  return {
    Client: vi.fn().mockImplementation(function () {
      return {
        connect: vi.fn(),
        end: vi.fn(),
        query: vi
          .fn()
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({}),
      };
    }),
  };
});

import { ensureDatabaseExists } from "../ensureDatabaseExists";

describe("ensureDatabaseExists", () => {
  it("creates database when missing", async () => {
    await ensureDatabaseExists("postgresql://user:pass@db:5432/desktop");
    const { Client } = await import("pg");
    const client = (Client as unknown as vi.Mock).mock.results[0].value;
    expect(client.query).toHaveBeenCalledWith(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      ["desktop"]
    );
    expect(client.query).toHaveBeenCalledWith('CREATE DATABASE "desktop"');
  });
});
