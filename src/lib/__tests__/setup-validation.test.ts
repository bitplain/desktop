import { describe, expect, it } from "vitest";
import { validateSecrets, validateDatabaseUrl } from "../setupValidation";

describe("setup validation", () => {
  it("rejects short secrets", () => {
    expect(validateSecrets("short", "short").ok).toBe(false);
  });
  it("accepts postgres url", () => {
    expect(validateDatabaseUrl("postgresql://u:p@h/db").ok).toBe(true);
  });
});
