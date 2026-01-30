import { describe, expect, it } from "vitest";
import { getAuthCallbackUrl } from "../authNavigation";

describe("auth navigation", () => {
  it("returns origin for valid current url", () => {
    const result = getAuthCallbackUrl("http://10.10.1.236:3000/login?from=1");
    expect(result).toBe("http://10.10.1.236:3000");
  });

  it("returns undefined for invalid url", () => {
    const result = getAuthCallbackUrl("not a url");
    expect(result).toBeUndefined();
  });
});
