import { describe, expect, it, vi } from "vitest";
import { getSetupStatus } from "../setupStatus";

describe("setup status", () => {
  it("returns needsSetup when no config", async () => {
    vi.stubEnv("DATABASE_URL", "");
    expect(await getSetupStatus({ mockConfig: null })).toBe("needsSetup");
  });
});
