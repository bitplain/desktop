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
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe("postgresql://desk:pa%20ss@db:5432/desktop");
    }
  });

  it("rejects missing fields", () => {
    const result = buildDatabaseUrl({
      host: "",
      port: "",
      user: "",
      password: "",
      database: "",
    });
    expect(result.ok).toBe(false);
  });
});
