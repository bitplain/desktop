import { describe, it, expect } from "vitest";
import { validateCsrf } from "../csrf";

describe("csrf", () => {
  it("accepts matching cookie + header", () => {
    const result = validateCsrf("token", "token");
    expect(result.ok).toBe(true);
  });
});
