import { describe, expect, it } from "vitest";
import { getSetupRedirect } from "../setupRoutes";

describe("setup redirects", () => {
  it("routes needsSetup to /setup/step-1", () => {
    expect(getSetupRedirect("needsSetup")).toBe("/setup/step-1");
  });

  it("routes needsAdmin to /setup/step-1", () => {
    expect(getSetupRedirect("needsAdmin")).toBe("/setup/step-1");
  });

  it("routes dbUnavailable to /setup/step-1", () => {
    expect(getSetupRedirect("dbUnavailable")).toBe("/setup/step-1");
  });
});
