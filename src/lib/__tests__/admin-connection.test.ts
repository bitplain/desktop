import { describe, expect, it, vi } from "vitest";
import { checkAdminConnection } from "../adminConnection";

const connections: Array<{ connectionString: string; ssl?: unknown }> = [];

vi.mock("pg", () => {
  class Client {
    connectionString: string;
    ssl?: unknown;
    constructor({ connectionString, ssl }: { connectionString: string; ssl?: unknown }) {
      this.connectionString = connectionString;
      this.ssl = ssl;
      connections.push({ connectionString, ssl });
    }
    async connect() {}
    async end() {}
  }
  return { Client };
});

describe("checkAdminConnection", () => {
  it("connects to postgres with ssl when enabled", async () => {
    await checkAdminConnection({
      host: "db",
      port: "5432",
      user: "admin",
      password: "secret",
      ssl: true,
    });

    expect(connections).toHaveLength(1);
    expect(connections[0].connectionString).toContain("/postgres");
    expect(connections[0].ssl).toEqual({ rejectUnauthorized: false });
  });

  it("connects without ssl when disabled", async () => {
    connections.length = 0;
    await checkAdminConnection({
      host: "db",
      port: "5432",
      user: "admin",
      password: "secret",
      ssl: false,
    });

    expect(connections).toHaveLength(1);
    expect(connections[0].ssl).toBeUndefined();
  });
});
