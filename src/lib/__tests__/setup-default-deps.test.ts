import { describe, expect, it, vi } from "vitest";
import { createDefaultSetupDeps } from "../setupCompletion";

describe("default setup deps", () => {
  it("generates non-empty secrets", () => {
    const deps = createDefaultSetupDeps();
    expect(deps.generateSecret().length).toBeGreaterThan(16);
  });

  it("applyConfig overrides existing env values", () => {
    vi.stubEnv("DATABASE_URL", "postgresql://old");
    vi.stubEnv("NEXTAUTH_SECRET", "old-secret");
    vi.stubEnv("KEYS_ENCRYPTION_SECRET", "old-keys");
    const deps = createDefaultSetupDeps();
    deps.applyConfig({
      databaseUrl: "postgresql://new",
      nextAuthSecret: "new-secret-1234567890",
      keysEncryptionSecret: "new-keys-1234567890",
    });
    expect(process.env.DATABASE_URL).toBe("postgresql://new");
    expect(process.env.NEXTAUTH_SECRET).toBe("new-secret-1234567890");
    expect(process.env.KEYS_ENCRYPTION_SECRET).toBe("new-keys-1234567890");
  });
});
