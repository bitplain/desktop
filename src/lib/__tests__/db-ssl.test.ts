import { describe, expect, it } from "vitest";
import { resolveSslConfig } from "../db-ssl";

describe("resolveSslConfig", () => {
  it("uses env flag when DATABASE_SSL=true", () => {
    const ssl = resolveSslConfig("postgresql://user:pass@host/db", "true");
    expect(ssl).toEqual({ rejectUnauthorized: false });
  });

  it("returns undefined when env flag is false and no ssl params", () => {
    const ssl = resolveSslConfig("postgresql://user:pass@host/db", "false");
    expect(ssl).toBeUndefined();
  });

  it("enables ssl when sslmode=require is present", () => {
    const ssl = resolveSslConfig(
      "postgresql://user:pass@host/db?sslmode=require",
      ""
    );
    expect(ssl).toEqual({ rejectUnauthorized: false });
  });

  it("enables ssl when sslaccept=accept_invalid_certs is present", () => {
    const ssl = resolveSslConfig(
      "postgresql://user:pass@host/db?sslaccept=accept_invalid_certs",
      ""
    );
    expect(ssl).toEqual({ rejectUnauthorized: false });
  });
});
