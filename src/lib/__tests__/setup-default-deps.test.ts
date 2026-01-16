import { describe, expect, it } from "vitest";
import { createDefaultSetupDeps } from "../setupCompletion";

describe("default setup deps", () => {
  it("generates non-empty secrets", () => {
    const deps = createDefaultSetupDeps();
    expect(deps.generateSecret().length).toBeGreaterThan(16);
  });
});
