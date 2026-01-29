import { describe, expect, it, vi } from "vitest";
import { repairDatabaseAccess } from "../adminRepair";

const instances: Array<{ connectionString: string; queries: string[] }> = [];

vi.mock("pg", () => {
  class Client {
    connectionString: string;
    queries: string[] = [];
    constructor({ connectionString }: { connectionString: string }) {
      this.connectionString = connectionString;
      instances.push(this);
    }
    async connect() {}
    async query(sql: string) {
      this.queries.push(sql);
      if (sql.includes("FROM pg_roles")) {
        return { rows: [] };
      }
      if (sql.includes("FROM pg_database")) {
        return { rows: [] };
      }
      return { rows: [] };
    }
    async end() {}
  }
  return { Client };
});

describe("repairDatabaseAccess", () => {
  it("connects to postgres and grants access", async () => {
    await repairDatabaseAccess({
      databaseUrl: "postgresql://user:pass@host:5432/desktop",
      databaseSsl: false,
    });

    expect(instances.length).toBe(2);
    expect(instances[0].connectionString).toContain("/postgres");
    expect(instances[1].connectionString).toContain("/desktop");

    const adminQueries = instances[0].queries.join("\n");
    expect(adminQueries).toContain("CREATE ROLE");
    expect(adminQueries).toContain("CREATE DATABASE");
    expect(adminQueries).toContain("GRANT ALL PRIVILEGES ON DATABASE");

    const dbQueries = instances[1].queries.join("\n");
    expect(dbQueries).toContain("GRANT ALL PRIVILEGES ON SCHEMA public");
  });
});
