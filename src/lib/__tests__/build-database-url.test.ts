import { describe, expect, it } from "vitest";
import { buildDatabaseUrl } from "../buildDatabaseUrl";

describe("buildDatabaseUrl", () => {
  it("builds a postgres url with encoded credentials", () => {
    const result = buildDatabaseUrl({
      host: "db",
      port: "5432",
      user: "desk",
      password: "pa ss",
      database: "desktop",
      ssl: false,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe("postgresql://desk:pa%20ss@db:5432/desktop");
    }
  });

  it("appends ssl options when ssl is enabled", () => {
    const result = buildDatabaseUrl({
      host: "db",
      port: "5432",
      user: "desk",
      password: "pa ss",
      database: "desktop",
      ssl: true,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(
        "postgresql://desk:pa%20ss@db:5432/desktop?sslmode=require&sslaccept=accept_invalid_certs"
      );
    }
  });

  it("rejects missing fields", () => {
    const result = buildDatabaseUrl({
      host: "",
      port: "",
      user: "",
      password: "",
      database: "",
      ssl: false,
    });
    expect(result.ok).toBe(false);
  });
});
