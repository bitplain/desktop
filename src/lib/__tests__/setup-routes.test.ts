import { describe, expect, it } from "vitest";
import { getSetupRedirect } from "../setupRoutes";

describe("setup redirects", () => {
  it("routes needsSetup to /setup", () => {
    expect(getSetupRedirect("needsSetup")).toBe("/setup");
  });

  it("routes needsAdmin to /setup", () => {
    expect(getSetupRedirect("needsAdmin")).toBe("/setup");
  });
});
